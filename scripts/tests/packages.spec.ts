import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'fs';
import { join } from 'path';
import { allowedPackages, getAllowedPackageNames, getLinkCommand } from '../packages';

const repoRoot = join(import.meta.dir, '..', '..');

function readPackageName(directory: string) {
  const packageJson = join(repoRoot, 'packages', directory, 'package.json');
  const pkg = JSON.parse(readFileSync(packageJson, 'utf8'));
  return pkg.name as string;
}

describe('package automation metadata', () => {
  test('includes mini-app-sdk in the releasable package list', () => {
    expect(allowedPackages).toContain('mini-app-sdk');
  });

  test('derives link instructions from actual package names', () => {
    const packageNames = getAllowedPackageNames();

    expect(packageNames).toContain(readPackageName('mini-app-sdk'));
    expect(packageNames).toContain(readPackageName('nimiq'));
    expect(getLinkCommand()).toContain(readPackageName('mini-app-sdk'));
    expect(getLinkCommand()).toContain(readPackageName('nimiq'));
  });
});
