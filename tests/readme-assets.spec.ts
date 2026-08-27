import { describe, expect, it } from 'vitest'
import { catalog } from '../src/themes/generated/catalog.ts'
import { generateReadmeAssets, SPOTLIGHT_SLUGS } from '../scripts/readme-assets.ts'

describe('README visual assets', () => {
  it('generates eight spotlights and one 74-theme atlas deterministically', () => {
    const first = generateReadmeAssets(catalog)
    const second = generateReadmeAssets(catalog)
    expect(second).toEqual(first)
    expect(first.map(asset => asset.path)).toEqual([
      ...SPOTLIGHT_SLUGS.map(slug => `docs/assets/readme/spotlight/${slug}.svg`).sort(),
      'docs/assets/readme/theme-atlas.svg',
    ].sort())
    const atlas = first.find(asset => asset.path.endsWith('theme-atlas.svg'))!.content
    expect(atlas.match(/data-theme-id=/g)).toHaveLength(74)
    expect(new Set([...atlas.matchAll(/data-theme-id="([^"]+)"/g)].map(match => match[1])).size).toBe(74)
  })

  it('uses the catalog preview colors in each spotlight', () => {
    const assets = generateReadmeAssets(catalog)
    for (const slug of SPOTLIGHT_SLUGS) {
      const entry = catalog.find(theme => theme.slug === slug)!
      const svg = assets.find(asset => asset.path.endsWith(`/${slug}.svg`))!.content
      expect(svg).toContain(entry.preview.base)
      expect(svg).toContain(entry.preview.layer)
      expect(svg).toContain(entry.preview.sidebar)
      expect(svg).toContain(entry.preview.text)
      expect(svg).toContain(entry.preview.accent)
    }
  })

  it('rejects incomplete, duplicate, or unsafe catalog data', () => {
    expect(() => generateReadmeAssets(catalog.slice(0, 73))).toThrow('expected 74 themes')
    expect(() => generateReadmeAssets([...catalog.slice(0, 73), catalog[0]!])).toThrow('duplicate theme id')
    const unsafe = catalog.map((entry, index) => index === 0
      ? { ...entry, name: '<script>', preview: { ...entry.preview, accent: 'not-a-color' } }
      : entry)
    expect(() => generateReadmeAssets(unsafe)).toThrow('invalid preview color')
  })
})
