import { defineConfig } from 'tsup'

export default defineConfig({
  entry: ['index.ts', 'provider.ts'],
  format: ['cjs', 'esm'],
  dts: { resolve: true },
  sourcemap: true,
  minify: true,
  clean: true,
  // Keep one error constructor across the SDK and provider entrypoints.
  splitting: true,
  external: [],
})
