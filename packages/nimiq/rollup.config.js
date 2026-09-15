import { name, dependencies } from './package.json';
import createConfig from '../../rollup.config';

export default createConfig(name, Object.keys(dependencies), {}, {
  // With type: module, Node requires the .cjs extension for CommonJS.
  file: './dist/index.cjs',
});
