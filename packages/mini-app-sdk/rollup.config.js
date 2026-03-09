import esbuild from 'rollup-plugin-esbuild';
import { nodeResolve } from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import json from '@rollup/plugin-json';

const plugins = [
  json(),
  nodeResolve({ preferBuiltins: false, browser: true }),
  commonjs(),
  esbuild({
    minify: true,
    tsconfig: './tsconfig.json',
    loaders: {
      '.json': 'json',
    },
  }),
];

export default [
  // Root entry (index.ts) exports init() and includes the global Window typings.
  {
    input: './index.ts',
    plugins,
    external: ['@nimiq/web3-provider-nimiq'],
    output: [
      {
        file: './dist/index.cjs.js',
        format: 'cjs',
        exports: 'named',
        sourcemap: true,
      },
      {
        file: './dist/index.es.js',
        format: 'es',
        sourcemap: true,
      },
    ],
  },
  // Provider subpath re-exports the dependency explicitly instead of bundling it.
  {
    input: './provider.ts',
    plugins,
    external: ['@nimiq/web3-provider-nimiq'],
    output: [
      {
        file: './dist/provider.cjs.js',
        format: 'cjs',
        exports: 'named',
        sourcemap: true,
      },
      {
        file: './dist/provider.es.js',
        format: 'es',
        sourcemap: true,
      },
    ],
  },
];
