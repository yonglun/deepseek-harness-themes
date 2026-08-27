import { execFile as execFileCallback } from 'node:child_process'
import { readFile, readdir } from 'node:fs/promises'
import { join, posix } from 'node:path'
import { promisify } from 'node:util'
import { parseDesign } from './parse-design.ts'
import type { SourceDesign } from './contracts.ts'

const execFile = promisify(execFileCallback)

export interface DiscoverSourceOptions {
  readonly root: string
  readonly expectedCommit: string
  readonly categoryOverrides?: Readonly<Record<string, string>>
  readonly readCommit?: (root: string) => Promise<string>
}

export interface DiscoveredSource {
  readonly commit: string
  readonly designs: readonly SourceDesign[]
  readonly categories: ReadonlyMap<string, string>
}

const CATEGORY_NAMES: Readonly<Record<string, string>> = Object.freeze({
  'ai & llm platforms': 'ai-llm',
  'developer tools & ides': 'developer-tools',
  'backend, database & devops': 'backend-devops',
  'productivity & saas': 'productivity-saas',
  'design & creative tools': 'design-creative',
  'fintech & crypto': 'fintech-crypto',
  'e-commerce & retail': 'ecommerce-retail',
  'media & consumer tech': 'media-consumer',
  automotive: 'automotive',
  'retro web · design.md nostalgia': 'retro-web',
})

function categoryFromHeading(heading: string): string {
  const normalized = heading.trim().toLocaleLowerCase()
  const known = CATEGORY_NAMES[normalized]
  if (known !== undefined) return known
  return normalized
    .replace(/design\.md/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

function extractCategories(readme: string): Map<string, string> {
  const collectionStart = readme.indexOf('## Collection')
  if (collectionStart < 0) throw new Error('README.md: missing ## Collection section')
  const remainder = readme.slice(collectionStart + '## Collection'.length)
  const nextSection = remainder.search(/^##\s+/m)
  const collection = nextSection < 0 ? remainder : remainder.slice(0, nextSection)
  const categories = new Map<string, string>()
  let currentCategory: string | undefined
  for (const line of collection.split(/\r?\n/)) {
    const heading = /^###\s+(.+?)\s*$/.exec(line)
    if (heading !== null) {
      currentCategory = categoryFromHeading(heading[1]!)
      continue
    }
    const link = /getdesign\.md\/([^/)\s]+)\/design-md(?:[)\s]|$)/.exec(line)
    if (link === null) continue
    if (currentCategory === undefined) throw new Error(`README.md: design ${link[1]} has no category heading`)
    const slug = decodeURIComponent(link[1]!)
    if (categories.has(slug)) throw new Error(`README.md: duplicate category entry for ${slug}`)
    categories.set(slug, currentCategory)
  }
  return categories
}

async function readGitCommit(root: string): Promise<string> {
  const result = await execFile('git', ['-C', root, 'rev-parse', 'HEAD'])
  return result.stdout.trim()
}

async function discoverPaths(root: string): Promise<string[]> {
  const designRoot = join(root, 'design-md')
  const entries = await readdir(designRoot, { withFileTypes: true })
  const paths: string[] = []
  for (const entry of entries) {
    if (!entry.isDirectory()) continue
    const relativePath = posix.join('design-md', entry.name, 'DESIGN.md')
    try {
      const stat = await readdir(join(designRoot, entry.name))
      if (stat.includes('DESIGN.md')) paths.push(relativePath)
    } catch {
      // Ignore entries that disappear during a source checkout update.
    }
  }
  return paths.sort()
}

export async function discoverSource({
  root,
  expectedCommit,
  categoryOverrides = {},
  readCommit = readGitCommit,
}: DiscoverSourceOptions): Promise<DiscoveredSource> {
  const commit = await readCommit(root)
  if (commit !== expectedCommit) {
    throw new Error(`source: expected commit ${expectedCommit} but found ${commit}`)
  }
  const [readme, relativePaths] = await Promise.all([
    readFile(join(root, 'README.md'), 'utf8'),
    discoverPaths(root),
  ])
  const listedCategories = extractCategories(readme)
  const sourceSlugs = new Set(relativePaths.map(relativePath => relativePath.split('/')[1]!))
  for (const slug of listedCategories.keys()) {
    if (!sourceSlugs.has(slug)) throw new Error(`README.md: category entry ${slug} has no DESIGN.md source`)
  }

  const categories = new Map<string, string>()
  for (const relativePath of relativePaths) {
    const slug = relativePath.split('/')[1]!
    const category = categoryOverrides[slug] ?? listedCategories.get(slug)
    if (category === undefined || category.trim().length === 0) {
      throw new Error(`source: missing category for ${slug}`)
    }
    categories.set(slug, category)
  }

  const designs = await Promise.all(
    relativePaths.map(relativePath => {
      const slug = relativePath.split('/')[1]!
      return parseDesign({ root, relativePath, category: categories.get(slug)! })
    }),
  )
  return Object.freeze({
    commit,
    designs: Object.freeze(designs),
    categories,
  })
}
