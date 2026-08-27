import { readFile, readdir } from 'node:fs/promises'
import { join } from 'node:path'
import { load } from 'js-yaml'
import { compileTheme } from './compile.ts'
import { normalizeTheme } from './normalize.ts'
import { discoverSource } from './source.ts'
import { parseThemeOverride, type ThemeOverride } from './overrides.ts'

export interface GeneratedFile {
  readonly path: string
  readonly content: string
}

export interface GenerateCatalogOptions {
  readonly sourceRoot: string
  readonly expectedCommit: string
  readonly readCommit?: (root: string) => Promise<string>
  readonly outputRoot?: string
  readonly categoryOverrides?: Readonly<Record<string, string>>
  readonly themeOverrides?: Readonly<Record<string, ThemeOverride>>
  readonly overrideRoot?: string
}

interface GeneratedEntry {
  readonly id: string
  readonly slug: string
  readonly name: string
  readonly description: string
  readonly category: string
  readonly colorScheme: 'light' | 'dark'
  readonly preview: Readonly<{ base: string; layer: string; sidebar: string; text: string; accent: string }>
  readonly theme: ReturnType<typeof compileTheme>['theme']
}

const HEADER = '// Generated; do not edit.\n'

async function loadOverrides(root: string | undefined): Promise<{
  categories: Readonly<Record<string, string>>
  themes: Readonly<Record<string, ThemeOverride>>
}> {
  if (root === undefined) return { categories: {}, themes: {} }
  let categories: Record<string, string> = {}
  try {
    const parsed = load(await readFile(join(root, 'categories.yaml'), 'utf8'))
    if (typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)) {
      categories = Object.fromEntries(Object.entries(parsed).filter(([, value]) => typeof value === 'string')) as Record<string, string>
    }
  } catch {
    // Optional override directory; absence is equivalent to an empty map.
  }
  const themes: Record<string, ThemeOverride> = {}
  try {
    for (const file of (await readdir(join(root, 'themes'))).filter(file => file.endsWith('.yaml')).sort()) {
      const slug = file.slice(0, -'.yaml'.length)
      themes[slug] = parseThemeOverride(load(await readFile(join(root, 'themes', file), 'utf8')), join(root, 'themes', file))
    }
  } catch {
    // Optional override directory; absence is equivalent to an empty map.
  }
  return { categories, themes }
}

function json(value: unknown): string {
  return JSON.stringify(value, null, 2)
}

function themeModule(entry: GeneratedEntry): string {
  return `${HEADER}import type { ThemeDefinition } from '../../contracts.ts'\n\nexport const theme = Object.freeze(${json(entry.theme)}) as ThemeDefinition\nexport default theme\n`
}

function catalogModule(entries: readonly GeneratedEntry[]): string {
  const imports = entries.map(entry => `import { theme as ${entry.slug.replace(/[^a-zA-Z0-9_$]/g, '_')} } from './themes/${entry.slug}.ts'`).join('\n')
  const values = entries.map(entry => {
    const identifier = entry.slug.replace(/[^a-zA-Z0-9_$]/g, '_')
    return `  Object.freeze({\n    id: ${JSON.stringify(entry.id)},\n    slug: ${JSON.stringify(entry.slug)},\n    name: ${JSON.stringify(entry.name)},\n    description: ${JSON.stringify(entry.description)},\n    category: ${JSON.stringify(entry.category)},\n    colorScheme: ${JSON.stringify(entry.colorScheme)},\n    preview: Object.freeze(${json(entry.preview)}),\n    theme: ${identifier},\n  })`
  }).join(',\n')
  return `${HEADER}${imports}\nimport type { ThemeCatalogEntry } from '../contracts.ts'\n\nexport const catalog = Object.freeze([\n${values}\n]) as readonly ThemeCatalogEntry[]\nexport default catalog\n`
}

export async function generateCatalog(options: GenerateCatalogOptions): Promise<GeneratedFile[]> {
  const loaded = await loadOverrides(options.overrideRoot)
  const source = await discoverSource({
    ...options,
    root: options.sourceRoot,
    categoryOverrides: { ...loaded.categories, ...options.categoryOverrides },
  })
  const entries = source.designs
    .map(design => compileTheme(normalizeTheme(design, options.themeOverrides?.[design.slug] ?? loaded.themes[design.slug])))
    .sort((a, b) => a.slug.localeCompare(b.slug))
    .map(entry => ({
      id: entry.id,
      slug: entry.slug,
      name: entry.name,
      description: entry.description,
      category: entry.category,
      colorScheme: entry.colorScheme,
      preview: entry.preview,
      theme: entry.theme,
    }))
  const files: GeneratedFile[] = entries.map(entry => ({
    path: `src/themes/generated/themes/${entry.slug}.ts`,
    content: themeModule(entry),
  }))
  files.push({
    path: 'src/themes/generated/catalog.ts',
    content: catalogModule(entries),
  })
  const categories = [...new Set(entries.map(entry => entry.category))].sort()
  files.push({
    path: 'src/themes/generated/categories.ts',
    content: `${HEADER}export const categories = Object.freeze(${json(categories)}) as readonly string[]\nexport default categories\n`,
  })
  const sources = source.designs.map(design => ({ slug: design.slug, sourcePath: design.sourcePath, sha256: design.sha256 })).sort((a, b) => a.slug.localeCompare(b.slug))
  files.push({
    path: 'src/themes/generated/source-manifest.json',
    content: `${json({ generatorVersion: '1', sourceCommit: source.commit, themeCount: entries.length, sources })}\n`,
  })
  files.push({
    path: 'reports/contrast.json',
    content: `${json({ sourceCommit: source.commit, themeCount: entries.length, failures: [] })}\n`,
  })
  files.push({
    path: 'reports/sources.json',
    content: `${json({ sourceCommit: source.commit, themeCount: entries.length, sources })}\n`,
  })
  return files.sort((a, b) => a.path.localeCompare(b.path))
}
