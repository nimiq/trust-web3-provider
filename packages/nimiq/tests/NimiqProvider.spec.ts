import { test, expect, afterEach, mock, describe } from 'bun:test';
import { Web3Provider } from '@trustwallet/web3-provider-core';
import { NimiqProvider } from '../NimiqProvider';
import { NimiqProviderError } from '../exceptions/NimiqProviderError';
import { RPCServer } from '../RPCServer';
import { AdapterStrategy } from '@trustwallet/web3-provider-core/adapter/Adapter';

let Nimiq = new NimiqProvider();
const account = '0x0000000000000000000000000000000000000000';

afterEach(() => {
  Nimiq = new NimiqProvider();
});

const walletCalls: Array<[string, (provider: NimiqProvider) => Promise<unknown>]> = [
  ['listAccounts', (provider) => provider.listAccounts()],
  ['sign', (provider) => provider.sign('hello')],
  ['sendBasicTransaction', (provider) => provider.sendBasicTransaction({ recipient: account, value: 1 })],
  ['sendBasicTransactionWithData', (provider) => provider.sendBasicTransactionWithData({ recipient: account, value: 1, data: 'data' })],
  ['sendNewStakerTransaction', (provider) => provider.sendNewStakerTransaction({ delegation: account, value: 1 })],
  ['sendStakeTransaction', (provider) => provider.sendStakeTransaction({ value: 1 })],
  ['sendSetActiveStakeTransaction', (provider) => provider.sendSetActiveStakeTransaction({ newActiveBalance: 1 })],
  ['sendUpdateStakerTransaction', (provider) => provider.sendUpdateStakerTransaction({ newDelegation: account })],
  ['sendRetireStakeTransaction', (provider) => provider.sendRetireStakeTransaction({ retireStake: 1 })],
  ['sendRemoveStakeTransaction', (provider) => provider.sendRemoveStakeTransaction({ value: 1 })],
];

const statusCalls: Array<[string, (provider: NimiqProvider) => Promise<unknown>]> = [
  ['isConsensusEstablished', (provider) => provider.isConsensusEstablished()],
  ['getBlockNumber', (provider) => provider.getBlockNumber()],
];

function registerErrorHandler(provider: NimiqProvider): void {
  new Web3Provider({
    strategy: AdapterStrategy.PROMISES,
    handler: () => Promise.resolve({
      error: {
        type: 'USER_REJECTED',
        message: 'User rejected the request',
      },
    }),
  }).registerProvider(provider);
}

describe('wallet errors', () => {
  test('preserves resolved errors without connecting or caching failures', async () => {
    const provider = new NimiqProvider();
    registerErrorHandler(provider);
    await expect(provider.listAccounts()).resolves.toEqual({
      error: { type: 'USER_REJECTED', message: 'User rejected the request' },
    });
    expect(provider.connected).toBe(false);
    new Web3Provider({ strategy: 'PROMISES', handler: () => Promise.resolve([account]) }).registerProvider(provider);
    await expect(provider.listAccounts()).resolves.toEqual([account]);
    expect(provider.connected).toBe(true);
  });

  test('preserves callback rejection objects', async () => {
    const provider = new NimiqProvider();
    const error = { code: 4001, message: 'Permission denied' };
    const bridge = new Web3Provider({ strategy: 'CALLBACK', handler: ({ id }) => bridge.sendError(id!, error) }).registerProvider(provider);
    await expect(provider.listAccounts()).rejects.toBe(error);
  });
  test('NimiqProviderError identifies errors across bundle boundaries', () => {
    expect(NimiqProviderError.is({
      name: 'NimiqProviderError',
      type: 'USER_REJECTED',
      message: 'User rejected the request',
    })).toBe(true);
    expect(NimiqProviderError.is(new Error('Other error'))).toBe(false);
    expect(NimiqProviderError.is({
      name: 'NimiqProviderError',
      type: 'USER_REJECTED',
      message: 'User rejected the request',
      code: '4001',
    })).toBe(false);
  });

  test.each(walletCalls)('%s preserves resolved host errors', async (_name, call) => {
    const provider = new NimiqProvider();
    registerErrorHandler(provider);

    await expect(call(provider)).resolves.toEqual({
      error: { type: 'USER_REJECTED', message: 'User rejected the request' },
    });
  });

  test('request preserves resolved host errors for wallet methods', async () => {
    registerErrorHandler(Nimiq);

    await expect(Nimiq.request({ method: 'listAccounts' })).resolves.toEqual({
      error: { type: 'USER_REJECTED', message: 'User rejected the request' },
    });
  });

  test('nim_requestAccounts preserves rejected host errors', async () => {
    const provider = new NimiqProvider();
    const bridge = new Web3Provider({
      strategy: AdapterStrategy.CALLBACK,
      handler: ({ id, name }) => {
        expect(name).toBe('listAccounts');
        bridge.sendError(id!, { code: 4001, message: 'Permission denied' });
      },
    }).registerProvider(provider);

    await expect(provider.request({ method: 'nim_requestAccounts' })).rejects.toMatchObject({
      code: 4001,
      message: 'Permission denied',
    });
  });
});

describe('non-wallet status errors', () => {
  test('nim_isConsensusEstablished preserves native errors', async () => {
    const hostError = { code: -32603, message: 'Host error' };
    const provider = new NimiqProvider();
    const bridge = new Web3Provider({
      strategy: AdapterStrategy.CALLBACK,
      handler: ({ id, name }) => {
        expect(name).toBe('isConsensusEstablished');
        bridge.sendError(id!, hostError);
      },
    }).registerProvider(provider);

    await expect(provider.request({ method: 'nim_isConsensusEstablished' })).rejects.toBe(hostError);
  });

  test.each(statusCalls)('%s preserves callback errors', async (_name, call) => {
    const hostError = { code: -32603, message: 'Host error' };
    const provider = new NimiqProvider();
    const bridge = new Web3Provider({
      strategy: AdapterStrategy.CALLBACK,
      handler: ({ id }) => bridge.sendError(id!, hostError),
    }).registerProvider(provider);

    await expect(call(provider)).rejects.toBe(hostError);
  });

  test.each(statusCalls)('%s preserves resolved legacy-shaped values', async (_name, call) => {
    const response = {
      error: {
        type: 'INTERNAL_ERROR',
        message: 'Host error',
      },
    };
    const provider = new NimiqProvider();
    new Web3Provider({
      strategy: AdapterStrategy.PROMISES,
      handler: () => Promise.resolve(response),
    }).registerProvider(provider);

    await expect(call(provider)).resolves.toBe(response);
  });
});

test('nim_requestAccounts forwards normalized wallet method', async () => {
  new Web3Provider({
    strategy: AdapterStrategy.PROMISES,
    handler: (request) => {
      expect(request.name).toBe('listAccounts');
      return Promise.resolve([account])
    },
  }).registerProvider(Nimiq);

  const accounts = await Nimiq.request({ method: 'nim_requestAccounts' });
  expect(accounts).toEqual([account]);
});

// RPC routing tests
describe('RPC routing', () => {
  test('unknown methods route through RPCServer when configured', async () => {
    const mockRpc = {
      call: mock(() => Promise.resolve({ blockNumber: 12345 })),
    } as unknown as RPCServer;

    Nimiq.setRPC(mockRpc);

    const result = await Nimiq.request({ method: 'getBlockByNumber', params: [100] });

    expect(mockRpc.call).toHaveBeenCalledTimes(1);
    expect(mockRpc.call).toHaveBeenCalledWith({
      jsonrpc: '2.0',
      method: 'getBlockByNumber',
      params: [100],
    });
    expect(result).toEqual({ blockNumber: 12345 });
  });

  test('wallet methods route through native handler even when RPC is configured', async () => {
    const nativeHandler = mock((request: any) => Promise.resolve([account]));

    new Web3Provider({
      strategy: AdapterStrategy.PROMISES,
      handler: nativeHandler,
    }).registerProvider(Nimiq);

    const mockRpc = {
      call: mock(() => Promise.resolve('should not be called')),
    } as unknown as RPCServer;
    Nimiq.setRPC(mockRpc);

    const accounts = await Nimiq.request({ method: 'listAccounts' });

    expect(nativeHandler).toHaveBeenCalledTimes(1);
    expect(mockRpc.call).not.toHaveBeenCalled();
    expect(accounts).toEqual([account]);
  });

  test('unknown methods throw error when RPC is not configured', async () => {
    expect(
      Nimiq.request({ method: 'someUnknownMethod' })
    ).rejects.toThrow('No RPC URL configured');
  });

  test('setRPCUrl creates an RPCServer instance', () => {
    Nimiq.setRPCUrl('https://rpc.example.com');
    expect(Nimiq.getRPC()).toBeInstanceOf(RPCServer);
  });

  test('constructor creates RPCServer from config.rpcUrl', () => {
    const provider = new NimiqProvider({ rpcUrl: 'https://rpc.example.com' });
    expect(provider.getRPC()).toBeInstanceOf(RPCServer);
  });
});
