import { beforeAll, describe, expect, test } from 'bun:test';
import { execFileSync, execSync } from 'child_process';
import { existsSync, readFileSync } from 'fs';
import { createRequire } from 'module';
import { join } from 'path';

const packageDir = join(import.meta.dir, '..');
const distDir = join(packageDir, 'dist');

beforeAll(() => {
  execSync('bun run build:source', { cwd: join(packageDir, '../nimiq'), stdio: 'pipe' });
  execSync('bun run build:source', { cwd: packageDir, stdio: 'pipe' });
});

describe('mini-app-sdk packaging', () => {
  test('build emits bundled type declarations', () => {
    const indexTypes = readFileSync(join(distDir, 'index.d.ts'), 'utf8');

    expect(indexTypes).toContain('InitOptions');
    expect(indexTypes).toContain('NimiqPayHostContext');
    expect(indexTypes).toContain('getHostLanguage');
    expect(indexTypes).toContain('getHostFiat');
    expect(indexTypes).toContain('Fiat');
    expect(indexTypes).not.toContain("from '@nimiq/web3-provider-nimiq'");
    expect(indexTypes).not.toContain("from '@trustwallet/web3-provider-core'");
  });

  test('build emits provider type declarations with inlined types', () => {
    const providerTypes = readFileSync(join(distDir, 'provider.d.ts'), 'utf8');

    expect(providerTypes).toContain('NimiqProvider');
    expect(providerTypes).not.toContain("from '@nimiq/web3-provider-nimiq'");
    expect(providerTypes).not.toContain("from '@trustwallet/web3-provider-core'");
  });

  test('runtime bundles export NimiqProviderError', async () => {
    const sdk = await import(join(distDir, 'index.js'));
    const provider = await import(join(distDir, 'provider.js'));
    const require = createRequire(import.meta.url);
    const sdkCjs = require(join(distDir, 'index.cjs'));
    const providerCjs = require(join(distDir, 'provider.cjs'));

    expect(typeof sdk.NimiqProviderError).toBe('function');

    const error = new sdk.NimiqProviderError('USER_REJECTED', 'User rejected the request');

    expect(provider.NimiqProviderError).toBe(sdk.NimiqProviderError);
    expect(sdk.NimiqProviderError.is(error)).toBe(true);
    expect(providerCjs.NimiqProviderError).toBe(sdkCjs.NimiqProviderError);
  });

  test('Nimiq package loads in Node ESM and CommonJS', () => {
    const output = execFileSync('node', ['--input-type=module', '--eval', `
      import { createRequire } from 'node:module';
      import { NimiqProvider } from '@nimiq/web3-provider-nimiq';
      const commonjs = createRequire(import.meta.url)('@nimiq/web3-provider-nimiq');
      console.log(typeof NimiqProvider, typeof commonjs.NimiqProvider);
    `], { cwd: join(packageDir, '../nimiq'), encoding: 'utf8' });

    expect(output.trim()).toBe('function function');
  });

  test('clean rebuild recreates declaration files', () => {
    execSync('bun run build:source', { cwd: packageDir, stdio: 'pipe' });

    expect(existsSync(join(distDir, 'index.d.ts'))).toBe(true);
    expect(existsSync(join(distDir, 'provider.d.ts'))).toBe(true);
  });

  test('npm pack includes expected dist files', () => {
    const output = execSync('npm pack --dry-run --json', {
      cwd: packageDir,
      encoding: 'utf8',
      stdio: 'pipe',
    });
    const [{ files }] = JSON.parse(output) as Array<{ files: Array<{ path: string }> }>;

    expect(files.some((file) => file.path === 'dist/index.js')).toBe(true);
    expect(files.some((file) => file.path === 'dist/index.cjs')).toBe(true);
    expect(files.some((file) => file.path === 'dist/index.d.ts')).toBe(true);
    expect(files.some((file) => file.path === 'dist/provider.js')).toBe(true);
    expect(files.some((file) => file.path === 'dist/provider.cjs')).toBe(true);
    expect(files.some((file) => file.path === 'dist/provider.d.ts')).toBe(true);
  });

  test('npm pack does not include TypeScript build metadata', () => {
    const output = execSync('npm pack --dry-run --json', {
      cwd: packageDir,
      encoding: 'utf8',
      stdio: 'pipe',
    });
    const [{ files }] = JSON.parse(output) as Array<{ files: Array<{ path: string }> }>;

    expect(files.some((file) => file.path.includes('tsconfig'))).toBe(false);
    expect(files.some((file) => file.path.includes('tsbuildinfo'))).toBe(false);
  });
});
