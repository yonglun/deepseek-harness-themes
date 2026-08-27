import { createHash } from 'node:crypto'
import { readFile } from 'node:fs/promises'
import { basename, dirname, resolve, sep } from 'node:path'
import { load } from 'js-yaml'
import type { SourceDesign } from './contracts.ts'

export interface ParseDesignOptions {
  readonly root: string
  readonly relativePath: string
  readonly category: string
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function requireString(relativePath: string, field: string, value: unknown): string {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new Error(`${relativePath}: missing required ${field} string`)
  }
  return value
}

function requireStringRecord(
  relativePath: string,
  field: string,
  value: unknown,
): Readonly<Record<string, string>> {
  if (!isRecord(value)) throw new Error(`${relativePath}: missing required ${field} record`)
  const result: Record<string, string> = {}
  for (const [key, item] of Object.entries(value)) {
    if (typeof item !== 'string') throw new Error(`${relativePath}: ${field}.${key} must be a string`)
    result[key] = item
  }
  return Object.freeze(result)
}

function requireObjectRecord(
  relativePath: string,
  field: string,
  value: unknown,
): Readonly<Record<string, Readonly<Record<string, unknown>>>> {
  if (!isRecord(value)) throw new Error(`${relativePath}: missing required ${field} record`)
  const result: Record<string, Readonly<Record<string, unknown>>> = {}
  for (const [key, item] of Object.entries(value)) {
    if (!isRecord(item)) throw new Error(`${relativePath}: ${field}.${key} must be an object`)
    result[key] = Object.freeze({ ...item })
  }
  return Object.freeze(result)
}

function loadFrontMatter(source: string): unknown {
  try {
    return load(source)
  } catch (firstError) {
    // A few upstream descriptions contain an unquoted colon. Preserve the
    // literal value while keeping strict YAML parsing for every other field.
    const normalized = source
      .split(/\r?\n/)
      .map(line => {
        const description = /^description:\s+(?![|>"'])(.*)$/.exec(line)
        if (description !== null) return `description: ${JSON.stringify(description[1]!)}`
        const scalar = /^([^\s:#][^:]*):\s+(?![|>"'])(.*)$/.exec(line)
        // Some legacy files contain a localized scalar key whose value has a
        // colon. Quote only top-level scalar entries; nested color maps remain
        // untouched so their structure and types stay strict.
        return scalar === null || line.startsWith(' ') ? line : `${scalar[1]}: ${JSON.stringify(scalar[2]!)}`
      })
      .join('\n')
    if (normalized === source) throw firstError
    return load(normalized)
  }
}

function slugify(value: string): string {
  return value.toLocaleLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

function parseLegacyDesign(relativePath: string, text: string): {
  name: string
  description: string
  colors: Readonly<Record<string, string>>
  typography: Readonly<Record<string, Readonly<Record<string, unknown>>>>
} {
  const title = /^#\s+(.+)$/m.exec(text)?.[1]?.trim() ?? basename(dirname(relativePath))
  const paragraphs = text
    .split(/\r?\n\s*\r?\n/)
    .map(part => part.trim())
    .filter(part => part.length > 0 && !part.startsWith('#') && !part.startsWith('-'))
  const description = paragraphs[0]?.replace(/\s+/g, ' ').trim() || `${title} design system`
  const colors: Record<string, string> = {}
  const paletteStart = text.search(/^##\s+2\.\s+Color Palette/im)
  const nextSection = paletteStart < 0 ? -1 : text.slice(paletteStart + 1).search(/^##\s+3\./im)
  const paletteSection = paletteStart < 0
    ? text
    : text.slice(paletteStart, nextSection < 0 ? undefined : paletteStart + 1 + nextSection)
  const colorPattern = /#[0-9a-f]{3,8}\b|rgba?\([^)]*\)|hsla?\([^)]*\)/gi
  for (const line of paletteSection.split(/\r?\n/)) {
    const matches = line.match(colorPattern) ?? []
    if (matches.length === 0) continue
    const label = /\*\*([^*]+)\*\*/.exec(line)?.[1]
    for (const [index, color] of matches.entries()) {
      const key = slugify(label ?? `${line.slice(0, line.indexOf(color)).replace(/[*`]/g, '').trim()}-${index}`) || `color-${Object.keys(colors).length}`
      if (colors[key] === undefined) colors[key] = color
    }
  }
  if (Object.keys(colors).length === 0) colors.primary = '#666666'
  const entries = Object.entries(colors)
  const find = (pattern: RegExp, exclude?: RegExp): string | undefined => {
    const hit = entries.find(([key]) => pattern.test(key) && (exclude === undefined || !exclude.test(key)))
    return hit?.[1]
  }
  if (colors.canvas === undefined) colors.canvas = find(/canvas|background|surface|white|cream|neutral|page/iu) ?? entries[0]![1]
  if (colors.ink === undefined) colors.ink = find(/ink|text|near-black|black|charcoal/iu) ?? entries[0]![1]
  if (colors.primary === undefined) colors.primary = find(/primary|brand|accent|purple|gold|blue|red|green/iu, /text|surface|background|neutral|dark|light|mute/iu) ?? entries[0]![1]
  if (colors.success === undefined) colors.success = find(/success|positive|green/iu, /dark|light|pale|mint/iu) ?? '#15803d'
  if (colors.warning === undefined) colors.warning = find(/warning|caution|amber|yellow/iu, /light|pale/iu) ?? '#a16207'
  if (colors.error === undefined) colors.error = find(/error|danger|destructive|red/iu, /light|pale/iu) ?? '#b91c1c'
  const fontLine = /(?:font family|primary|display)[^\n]*?(?:\*\*|:)?\s*([^\n]+)/i.exec(text)
  const fontFamily = fontLine?.[1]?.replace(/[|*_`]/g, '').trim() || 'system-ui, sans-serif'
  return {
    name: `${title.replace(/^Design System Inspired by\s+/i, '').trim()}-design-analysis`,
    description,
    colors: Object.freeze(colors),
    typography: Object.freeze({ display: Object.freeze({ fontFamily }) }),
  }
}

export async function parseDesign({ root, relativePath, category }: ParseDesignOptions): Promise<SourceDesign> {
  const absolutePath = resolve(root, relativePath)
  const bytes = await readFile(absolutePath)
  const text = bytes.toString('utf8')
  const match = /^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/.exec(text)
  if (match === null && !text.startsWith('---')) {
    const legacy = parseLegacyDesign(relativePath, text)
    return Object.freeze({
      slug: basename(dirname(relativePath)),
      name: legacy.name,
      description: legacy.description,
      category: requireString(relativePath, 'category', category),
      colors: legacy.colors,
      typography: legacy.typography,
      sourcePath: relativePath.split(sep).join('/'),
      sha256: createHash('sha256').update(bytes).digest('hex'),
    })
  }
  if (match === null) throw new Error(`${relativePath}: missing closed YAML front matter`)

  let value: unknown
  try {
    value = loadFrontMatter(match[1]!)
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    throw new Error(`${relativePath}: invalid YAML front matter: ${message}`)
  }
  if (!isRecord(value)) throw new Error(`${relativePath}: front matter must be a mapping`)

  const colors = requireStringRecord(relativePath, 'colors', value.colors)
  const typography = requireObjectRecord(relativePath, 'typography', value.typography)
  return Object.freeze({
    slug: basename(dirname(relativePath)),
    name: requireString(relativePath, 'name', value.name),
    description: requireString(relativePath, 'description', value.description),
    category: requireString(relativePath, 'category', category),
    colors,
    typography,
    sourcePath: relativePath.split(sep).join('/'),
    sha256: createHash('sha256').update(bytes).digest('hex'),
  })
}
