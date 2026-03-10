import { test, expect, afterEach, describe } from 'bun:test';
import type { NimiqProvider } from '../index';

// Polyfill window for bun test environment
if (typeof globalThis.window === 'undefined') {
  (globalThis as any).window = globalThis;
}

import { init } from '../init';

afterEach(() => {
  delete (window as any).nimiq;
});

describe('init', () => {
  test('returns immediately if window.nimiq is already set', async () => {
    const fakeProvider = { fake: true } as unknown as NimiqProvider;
    (window as any).nimiq = fakeProvider;

    const result = await init();
    expect(result).toBe(fakeProvider);
  });

  test('resolves when window.nimiq is set after a delay', async () => {
    const fakeProvider = { fake: true } as unknown as NimiqProvider;

    setTimeout(() => {
      (window as any).nimiq = fakeProvider;
    }, 100);

    const result = await init();
    expect(result).toBe(fakeProvider);
  });

  test('rejects after timeout if provider is never injected', async () => {
    await expect(init({ timeout: 100 })).rejects.toThrow(
      'Nimiq provider was not injected. Are you running inside a Nimiq app?'
    );
  });
});
