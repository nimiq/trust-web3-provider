import { beforeAll, describe, expect, test } from 'bun:test';
import { execSync } from 'child_process';
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';

const packageDir = join(import.meta.dir, '..');
const distDir = join(packageDir, 'dist');

beforeAll(() => {
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
