import * as fs from 'fs';
import * as path from 'path';

/**
 * List of packages that are able to build and distribute
 */
export const allowedPackages = [
  'core',
  'cosmos',
  'ethereum',
  'solana',
  'aptos',
  'ton',
  'tron',
  'bitcoin',
  'nimiq',
  'mini-app-sdk',
];

const subpackagesDir = path.resolve(__dirname, '../packages');

export function getAllowedPackageDirectories() {
  return allowedPackages.slice();
}

export function getPackageName(directory: string) {
  const packageJson = path.join(subpackagesDir, directory, 'package.json');
  const pkg = JSON.parse(fs.readFileSync(packageJson, 'utf-8'));
  return pkg.name as string;
}

export function getAllowedPackageNames() {
  return getAllowedPackageDirectories().map((directory) => getPackageName(directory));
}

export function getLinkCommand() {
  return `npm link ${getAllowedPackageNames().join(' ')}`;
}
