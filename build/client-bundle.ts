import { readFileSync } from 'node:fs'
import { basename, dirname, resolve } from 'node:path'
import { transform } from 'lightningcss'
import type { UserConfig } from 'tsdown'

const HOST_MODULE = /^@deepseek-ai(?:\/|$)/

function cssModulePlugin() {
  const sourceByVirtual = new Map<string, string>()
  return {
    name: 'deepseek-harness-design-md-themes-css-modules',
    resolveId(source: string, importer?: string) {
      const clean = source.split('?')[0] ?? source
      if (!clean.endsWith('.module.css')) return null
      const absolute = importer === undefined ? resolve(clean) : resolve(dirname(importer), clean)
      const virtual = `\0dsh-module:${Buffer.from(absolute).toString('base64url')}`
      sourceByVirtual.set(virtual, absolute)
      return virtual
    },
    load(id: string) {
      if (!id.startsWith('\0dsh-module:')) return null
      const sourcePath = sourceByVirtual.get(id)
      if (sourcePath === undefined) return null
      const filename = basename(sourcePath)
      const result = transform({ filename, code: readFileSync(sourcePath), cssModules: true })
      const classMap = Object.fromEntries(Object.entries(result.exports ?? {}).map(([key, value]) => [key, value.name]))
      const tagName = `deepseek-harness-design-md-themes/${filename}`
      const css = Buffer.from(result.code).toString('utf8')
      return `const classes = ${JSON.stringify(classMap)};\nconst cssText = ${JSON.stringify(css)};\nconst tagName = ${JSON.stringify(tagName)};\nif (typeof document !== 'undefined' && !document.head.querySelector('style[data-plugin-css="' + tagName + '"]')) { const style = document.createElement('style'); style.setAttribute('data-plugin-css', tagName); style.textContent = cssText; document.head.appendChild(style); }\nexport const disposeCss = () => { if (typeof document !== 'undefined') document.head.querySelector('style[data-plugin-css="' + tagName + '"]')?.remove(); };\nexport default classes;`
    },
  }
}

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
      plugins: [cssModulePlugin()],
      deps: {
        neverBundle: [HOST_MODULE, 'react', 'react/jsx-runtime'],
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
