import type { ThemeCatalogEntry } from '../src/themes/contracts.ts'

export const SPOTLIGHT_SLUGS = Object.freeze([
  'claude',
  'binance',
  'linear.app',
  'airbnb',
  'spotify',
  'posthog',
  'ferrari',
  'nintendo-2001',
] as const)

export interface ReadmeAsset {
  readonly path: string
  readonly content: string
}

const HEX = /^#[0-9a-f]{3}(?:[0-9a-f]{3})?$/i
const XML_ESCAPES: Readonly<Record<string, string>> = Object.freeze({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;',
})

function escapeXml(value: string): string {
  return value.replace(/[&<>"']/g, character => XML_ESCAPES[character]!)
}

function validateCatalog(catalog: readonly ThemeCatalogEntry[]): void {
  if (catalog.length !== 74) throw new Error(`expected 74 themes, found ${catalog.length}`)
  const ids = new Set<string>()
  for (const entry of catalog) {
    if (ids.has(entry.id)) throw new Error(`duplicate theme id: ${entry.id}`)
    ids.add(entry.id)
    for (const [role, color] of Object.entries(entry.preview)) {
      if (!HEX.test(color)) throw new Error(`invalid preview color for ${entry.id}.${role}: ${color}`)
    }
  }
  for (const slug of SPOTLIGHT_SLUGS) {
    if (!catalog.some(entry => entry.slug === slug)) throw new Error(`missing spotlight theme: ${slug}`)
  }
}

function miniInterface(entry: ThemeCatalogEntry, width: number, height: number): string {
  const sidebarWidth = Math.round(width * 0.22)
  const contentX = sidebarWidth + 28
  return `<g data-theme-id="${escapeXml(entry.id)}">
      <rect width="${width}" height="${height}" rx="18" fill="${entry.preview.base}"/>
      <rect x="${sidebarWidth}" width="${width - sidebarWidth}" height="${height}" rx="18" fill="${entry.preview.layer}"/>
      <rect width="${sidebarWidth}" height="${height}" rx="18" fill="${entry.preview.sidebar}"/>
      <rect x="${sidebarWidth - 18}" width="18" height="${height}" fill="${entry.preview.sidebar}"/>
      <rect x="${contentX}" y="${Math.round(height * .28)}" width="${Math.round(width * .46)}" height="10" rx="5" fill="${entry.preview.text}" opacity=".78"/>
      <rect x="${contentX}" y="${Math.round(height * .28) + 22}" width="${Math.round(width * .31)}" height="8" rx="4" fill="${entry.preview.text}" opacity=".38"/>
      <rect x="${contentX}" y="${Math.round(height * .28) + 48}" width="${Math.round(width * .19)}" height="22" rx="6" fill="${entry.preview.accent}"/>
    </g>`
}

function spotlightSvg(entry: ThemeCatalogEntry): string {
  const name = escapeXml(entry.name)
  return `<svg xmlns="http://www.w3.org/2000/svg" width="720" height="420" viewBox="0 0 720 420" role="img" aria-labelledby="title">
  <title id="title">${name} theme preview</title>
  <rect width="720" height="420" rx="28" fill="#111318"/>
  <g transform="translate(36 36)">${miniInterface(entry, 648, 286)}</g>
  <text x="42" y="364" fill="#f8fafc" font-family="ui-monospace, SFMono-Regular, monospace" font-size="22" font-weight="700">${name.toUpperCase()}</text>
  <circle cx="654" cy="356" r="13" fill="${entry.preview.accent}"/>
</svg>\n`
}

function atlasSvg(catalog: readonly ThemeCatalogEntry[]): string {
  const columns = 6
  const cardWidth = 240
  const cardHeight = 142
  const gap = 16
  const outer = 32
  const rows = Math.ceil(catalog.length / columns)
  const width = outer * 2 + columns * cardWidth + (columns - 1) * gap
  const height = 96 + outer + rows * cardHeight + (rows - 1) * gap + outer
  const cards = catalog.map((entry, index) => {
    const x = outer + (index % columns) * (cardWidth + gap)
    const y = 96 + outer + Math.floor(index / columns) * (cardHeight + gap)
    return `<g transform="translate(${x} ${y})">
      ${miniInterface(entry, cardWidth, 104)}
      <text x="4" y="132" fill="#e5e7eb" font-family="ui-monospace, SFMono-Regular, monospace" font-size="12" font-weight="700">${escapeXml(entry.name.toUpperCase())}</text>
    </g>`
  }).join('\n')
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-labelledby="title">
  <title id="title">74 Design MD themes</title>
  <rect width="${width}" height="${height}" rx="30" fill="#111318"/>
  <text x="${outer}" y="58" fill="#f8fafc" font-family="system-ui, sans-serif" font-size="34" font-weight="800">THEME ATLAS / 01—74</text>
  ${cards}
</svg>\n`
}

export function generateReadmeAssets(catalog: readonly ThemeCatalogEntry[]): readonly ReadmeAsset[] {
  validateCatalog(catalog)
  const spotlights = SPOTLIGHT_SLUGS.map(slug => {
    const entry = catalog.find(theme => theme.slug === slug)!
    return { path: `docs/assets/readme/spotlight/${slug}.svg`, content: spotlightSvg(entry) }
  })
  return Object.freeze([
    ...spotlights,
    { path: 'docs/assets/readme/theme-atlas.svg', content: atlasSvg(catalog) },
  ].sort((left, right) => left.path.localeCompare(right.path)))
}
