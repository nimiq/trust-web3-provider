import { test, expect, jest, afterEach, mock, describe } from 'bun:test';
import { Web3Provider } from '@trustwallet/web3-provider-core';
import { NimiqProvider } from '../NimiqProvider';
import { RPCServer } from '../RPCServer';
import { AdapterStrategy } from '@trustwallet/web3-provider-core/adapter/Adapter';

let Nimiq = new NimiqProvider();
const account = '0x0000000000000000000000000000000000000000';

afterEach(() => {
  Nimiq = new NimiqProvider();
});

// Direct methods
test('Nimiq Awesome test', async () => {
  new Web3Provider({
    strategy: AdapterStrategy.PROMISES,
    handler: (request) => {
      expect(request.name).toBe('requestAccounts'); // Normalized method name
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
