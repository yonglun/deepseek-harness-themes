import { mkdir, writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { catalog } from '../src/themes/generated/catalog.ts'
import en from './site/content.en.ts'
import zh from './site/content.zh.ts'
import { renderPage } from './site/page.ts'

const root = new URL('../site/', import.meta.url)
const themes = catalog.map(({ id, slug, name, category, colorScheme, preview }) => ({ id, slug, name, category, colorScheme, preview }))
if (new Set(themes.map(t => t.id)).size !== 74) throw new Error('Expected 74 unique themes')
for (const theme of themes) {
  if (!Object.values(theme.preview).every(color => /^#[0-9a-f]{6}$/i.test(color))) throw new Error(`Invalid palette: ${theme.id}`)
}
await mkdir(new URL('assets/', root), { recursive: true })
await mkdir(new URL('zh/', root), { recursive: true })
await writeFile(new URL('assets/themes.json', root), JSON.stringify(themes) + '\n')
for (const [content, prefix, file] of [[en, './', 'index.html'], [zh, '../', 'zh/index.html']] as const) {
  await writeFile(new URL(file, root), renderPage(content, prefix))
}
console.log(`Generated 2 landing pages and ${themes.length} theme palettes in ${fileURLToPath(root)}`)
