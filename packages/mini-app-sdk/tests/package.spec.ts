import { beforeAll, describe, expect, test } from 'bun:test';
import { execSync } from 'child_process';
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';

const packageDir = join(import.meta.dir, '..');
const distTypesDir = join(packageDir, 'dist', 'types');

beforeAll(() => {
  execSync('bun run build:source', { cwd: packageDir, stdio: 'pipe' });
});

describe('mini-app-sdk packaging', () => {
  test('build emits the global window typings in the published type surface', () => {
    const indexTypes = readFileSync(join(distTypesDir, 'index.d.ts'), 'utf8');

    expect(existsSync(join(distTypesDir, 'globals.d.ts'))).toBe(true);
    expect(indexTypes).toContain("./globals");
    expect(indexTypes).toContain("InitOptions");
  });

  test('clean rebuild recreates declaration files', () => {
    execSync('bun run build:source', { cwd: packageDir, stdio: 'pipe' });

    expect(existsSync(join(distTypesDir, 'index.d.ts'))).toBe(true);
    expect(existsSync(join(distTypesDir, 'globals.d.ts'))).toBe(true);
  });

  test('npm pack includes the emitted global window typings', () => {
    const output = execSync('npm pack --dry-run --json', {
      cwd: packageDir,
      encoding: 'utf8',
      stdio: 'pipe',
    });
    const [{ files }] = JSON.parse(output) as Array<{ files: Array<{ path: string }> }>;

    expect(files.some((file) => file.path === 'dist/types/globals.d.ts')).toBe(true);
  });

  test('npm pack does not include TypeScript build metadata', () => {
    const output = execSync('npm pack --dry-run --json', {
      cwd: packageDir,
      encoding: 'utf8',
      stdio: 'pipe',
    });
    const [{ files }] = JSON.parse(output) as Array<{ files: Array<{ path: string }> }>;

    expect(files.some((file) => file.path === 'dist/types/tsconfig.tsbuildinfo')).toBe(false);
  });
});
