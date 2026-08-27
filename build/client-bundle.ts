import type { UserConfig } from 'tsdown'

const HOST_MODULE = /^@deepseek-ai(?:\/|$)/

/** Emit the Host library and the browser module-loader factory. */
export function clientBundle(id: string): UserConfig[] {
  return [
    {
      name: id,
      entry: { index: 'src/index.ts' },
      outDir: 'lib',
      format: ['esm'],
      fixedExtension: false,
      dts: false,
      clean: false,
    },
    {
      name: `${id}/client`,
      entry: { client: 'src/client.ts' },
      outDir: 'lib',
      format: 'cjs',
      platform: 'browser',
      clean: false,
      deps: {
        neverBundle: [HOST_MODULE, 'react', 'react/jsx-runtime'],
        onlyBundle: ['clsx'],
      },
      outputOptions: {
        entryFileNames: 'client.js',
        banner: `window.__ModuleLoader__.load({ id: ${JSON.stringify(id)}, factory: (require) => {`,
        footer: 'return module.exports; } });',
        intro: 'var module = { exports: {} }; var exports = module.exports;',
      },
    },
  ]
}
