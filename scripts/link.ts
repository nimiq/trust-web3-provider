import * as fs from 'fs';
import * as path from 'path';
import { execSync, exec } from 'child_process';
import { getAllowedPackageDirectories, getLinkCommand } from './packages';

const subpackagesDir = path.resolve(__dirname, '../packages');

const directories = fs
  .readdirSync(subpackagesDir, { withFileTypes: true })
  .filter((dirent) => dirent.isDirectory())
  .map((dirent) => dirent.name)
  .filter((name) => getAllowedPackageDirectories().includes(name));

Promise.all(
  directories.map((directory) => {
    const dirPath = path.join(subpackagesDir, directory);

    console.log(`Building ${directory}`);

    try {
      execSync('bun build:clean', { stdio: 'inherit', cwd: dirPath });
      exec('tsc -w', { cwd: dirPath });
      exec('rollup --config ./rollup.config.js --watch', {
        cwd: dirPath,
      });

      setTimeout(
        () => execSync('npm link --silent', { stdio: 'inherit', cwd: dirPath }),
        2000,
      );
      console.log(`Built ${directory}`);
    } catch (error) {
      console.error(`Failed to build ${directory}`);
      console.error(error);
    }
  }),
).then(() => console.warn(`\n\nUse the packages like this: \n\n${getLinkCommand()}\n`));
