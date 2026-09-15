import { test, expect, afterEach, describe } from 'bun:test';
import { NimiqProviderError, type NimiqProvider } from '../index';
import { NimiqProvider as HostProvider } from '../../nimiq/NimiqProvider';
import { Web3Provider } from '@trustwallet/web3-provider-core';

// Polyfill window for bun test environment
if (typeof globalThis.window === 'undefined') {
  (globalThis as any).window = globalThis;
}

import { init } from '../init';

const statusCalls: Array<[string, (provider: NimiqProvider) => Promise<unknown>]> = [
  ['isConsensusEstablished', (provider) => provider.isConsensusEstablished()],
  ['getBlockNumber', (provider) => provider.getBlockNumber()],
];

afterEach(() => {
  delete window.nimiq;
});

describe('init', () => {
  test('preserves callback-shaped results from non-wallet RPC requests', async () => {
    const response = { code: 7, message: 'Success' };
    const fakeProvider = {
      request: () => Promise.resolve(response),
    } as unknown as HostProvider;
    window.nimiq = fakeProvider;

    const result = await init();

    await expect(result.request({ method: 'custom_rpc' })).resolves.toBe(response);
  });

  test('preserves rejected errors from non-wallet RPC requests', async () => {
    const rpcError = { code: -32602, message: 'Invalid RPC params' };
    const fakeProvider = {
      request: () => Promise.reject(rpcError),
    } as unknown as HostProvider;
    window.nimiq = fakeProvider;

    const result = await init();

    await expect(result.request({ method: 'custom_rpc' })).rejects.toBe(rpcError);
  });

  test.each(['listAccounts', 'nim_requestAccounts'])('normalizes rejected errors from request(%s)', async (method) => {
    window.nimiq = {
      request: () => Promise.reject({ code: 4001, message: 'Permission denied' }),
    } as unknown as HostProvider;

    const sdk = await init();
    await expect(sdk.request({ method })).rejects.toMatchObject({
      name: 'NimiqProviderError',
      type: 'PERMISSION_DENIED',
      code: 4001,
      message: 'Permission denied',
    });
  });

  test.each([
    [4001, 'PERMISSION_DENIED'],
    [4200, 'UNKNOWN_REQUEST'],
    [-32602, 'INVALID_TRANSACTION'],
    [-32000, 'NETWORK_ERROR'],
    [-32603, 'INTERNAL_ERROR'],
    [-32099, 'UNKNOWN_ERROR'],
  ])('maps old Nimiq Pay error code %d to %s', async (code, type) => {
    const provider = new HostProvider();
    const bridge = new Web3Provider({
      strategy: 'CALLBACK',
      handler: ({ id }) => bridge.sendError(id!, { code, message: 'Host error' }),
    }).registerProvider(provider);
    window.nimiq = provider;

    const sdk = await init();
    await expect(sdk.listAccounts()).rejects.toMatchObject({
      name: 'NimiqProviderError',
      type,
      code,
      message: 'Host error',
    });
  });

  test.each(statusCalls)('preserves rejected errors from %s', async (name, call) => {
    const hostError = { code: -32603, message: 'Host error' };
    const fakeProvider = {
      [name]: () => Promise.reject(hostError),
    } as unknown as HostProvider;
    window.nimiq = fakeProvider;

    const result = await init();

    await expect(call(result)).rejects.toBe(hostError);
  });

  test.each(statusCalls)('preserves resolved legacy-shaped values from %s', async (name, call) => {
    const response = {
      error: {
        type: 'INTERNAL_ERROR',
        message: 'Host error',
      },
    };
    const fakeProvider = {
      [name]: () => Promise.resolve(response),
    } as unknown as HostProvider;
    window.nimiq = fakeProvider;

    const result = await init();

    await expect(call(result)).resolves.toBe(response);
  });

  test('normalizes callback errors from providers injected after init', async () => {
    const fakeProvider = {
      listAccounts: () => Promise.reject({
        code: 4001,
        message: 'Permission denied',
      }),
    } as unknown as HostProvider;

    setTimeout(() => {
      window.nimiq = fakeProvider;
    }, 100);

    const result = await init();

    expect(result).not.toBe(fakeProvider);
    await expect(result.listAccounts()).rejects.toBeInstanceOf(NimiqProviderError);
    await expect(result.listAccounts()).rejects.toMatchObject({
      type: 'PERMISSION_DENIED',
      code: 4001,
      message: 'Permission denied',
    });
  });

  test('rejects after timeout if provider is never injected', async () => {
    await expect(init({ timeout: 100 })).rejects.toThrow(
      'Nimiq provider was not injected. Are you running inside a Nimiq app?'
    );
  });

  test('returns a reusable SDK wrapper without modifying the injected provider', async () => {
    const provider = new HostProvider();
    const listAccounts = provider.listAccounts;
    window.nimiq = provider;

    const first = await init();
    const second = await init();

    expect(first).toBe(second);
    expect(first).not.toBe(provider);
    expect(provider.listAccounts).toBe(listAccounts);
    expect(window.nimiq).toBe(provider);
  });

  test('supports frozen providers and synchronous wallet errors', async () => {
    const error = { code: 4001, message: 'Permission denied' };
    const provider = Object.freeze({ listAccounts() { throw error; } });
    window.nimiq = provider as unknown as HostProvider;
    const sdk = await init();

    await expect(sdk.listAccounts()).rejects.toMatchObject({ name: 'NimiqProviderError', type: 'PERMISSION_DENIED', code: 4001 });
    expect(() => provider.listAccounts()).toThrow();
    expect(window.nimiq).toBe(provider);
  });

  test('normalizes account and connect errors without changing the host contract', async () => {
    const provider = new HostProvider();
    const response = { error: { type: 'PERMISSION_DENIED', message: 'Permission denied' } };
    new Web3Provider({ strategy: 'PROMISES', handler: () => Promise.resolve(response) }).registerProvider(provider);
    window.nimiq = provider;

    const sdk = await init();
    await expect(sdk.listAccounts()).rejects.toMatchObject({ name: 'NimiqProviderError', type: 'PERMISSION_DENIED' });
    await expect(sdk.connect()).rejects.toMatchObject({ name: 'NimiqProviderError', type: 'PERMISSION_DENIED' });
    expect(sdk.connected).toBe(false);
    await expect(provider.listAccounts()).resolves.toBe(response);
  });

  test('keeps callback rejection identity for raw callers after SDK init', async () => {
    const provider = new HostProvider();
    const error = { code: 4001, type: 'CUSTOM_DENIAL', message: 'Permission denied' };
    const bridge = new Web3Provider({
      strategy: 'CALLBACK',
      handler: ({ id }) => bridge.sendError(id!, error),
    }).registerProvider(provider);
    window.nimiq = provider;

    const sdk = await init();
    await expect(sdk.listAccounts()).rejects.toMatchObject({ name: 'NimiqProviderError', ...error });
    await expect(provider.listAccounts()).rejects.toBe(error);
  });

  test.each([
    ['listAccounts', (p: NimiqProvider) => p.listAccounts()],
    ['sign', (p: NimiqProvider) => p.sign('hello')],
    ['sendBasicTransaction', (p: NimiqProvider) => p.sendBasicTransaction({ recipient: 'NQ00 ACCOUNT', value: 1 })],
    ['sendBasicTransactionWithData', (p: NimiqProvider) => p.sendBasicTransactionWithData({ recipient: 'NQ00 ACCOUNT', value: 1, data: 'hello' })],
    ['sendNewStakerTransaction', (p: NimiqProvider) => p.sendNewStakerTransaction({ delegation: 'NQ00 ACCOUNT', value: 1 })],
    ['sendStakeTransaction', (p: NimiqProvider) => p.sendStakeTransaction({ value: 1 })],
    ['sendSetActiveStakeTransaction', (p: NimiqProvider) => p.sendSetActiveStakeTransaction({ newActiveBalance: 1 })],
    ['sendUpdateStakerTransaction', (p: NimiqProvider) => p.sendUpdateStakerTransaction({ newDelegation: 'NQ00 ACCOUNT' })],
    ['sendRetireStakeTransaction', (p: NimiqProvider) => p.sendRetireStakeTransaction({ retireStake: 1 })],
    ['sendRemoveStakeTransaction', (p: NimiqProvider) => p.sendRemoveStakeTransaction({ value: 1 })],
  ] as const)('%s normalizes both legacy and callback wallet errors', async (_name, call) => {
    for (const strategy of ['PROMISES', 'CALLBACK'] as const) {
      const provider = new HostProvider();
      const bridge = new Web3Provider({
        strategy,
        handler: ({ id }) => strategy === 'CALLBACK'
          ? bridge.sendError(id!, { code: 4001, message: 'Permission denied' })
          : Promise.resolve({ error: { type: 'PERMISSION_DENIED', message: 'Permission denied' } }),
      }).registerProvider(provider);
      window.nimiq = provider;
      const sdk = await init();

      const result = call(sdk);
      await expect(result).rejects.toBeInstanceOf(NimiqProviderError);
      await expect(result).rejects.toMatchObject({
        name: 'NimiqProviderError',
        type: 'PERMISSION_DENIED',
        message: 'Permission denied',
      });
    }
  });

  test('preserves private state, events, chaining and successful values', async () => {
    const provider = new HostProvider();
    const accounts = ['NQ00 ACCOUNT'];
    new Web3Provider({ strategy: 'PROMISES', handler: () => Promise.resolve(accounts) }).registerProvider(provider);
    window.nimiq = provider;

    const sdk = await init();
    let connections = 0;
    const listener = () => { connections++; };
    expect(sdk.on('connect', listener)).toBe(sdk);
    const { listAccounts } = sdk;
    await expect(listAccounts()).resolves.toBe(accounts);
    expect(sdk.connected).toBe(true);
    await expect(sdk.listAccounts()).resolves.toBe(accounts);
    expect(connections).toBe(1);
    sdk.disconnect();
    expect(sdk.connected).toBe(false);
    sdk.off('connect', listener);
  });
});
