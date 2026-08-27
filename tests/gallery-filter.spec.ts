import { describe, expect, it } from 'vitest'
import { catalog } from '../src/themes/generated/catalog.ts'
import { filterCatalog } from '../src/gallery/filter.ts'

describe('filterCatalog', () => {
  it('searches name, slug, category and description case-insensitively', () => {
    expect(filterCatalog(catalog, { query: 'warm', scheme: 'all', category: 'all' }).map(x => x.slug)).toContain('claude')
    expect(filterCatalog(catalog, { query: 'AI-LLM', scheme: 'all', category: 'all' }).length).toBeGreaterThan(1)
  })

  it('combines scheme and category filters without mutating catalog order', () => {
    const fixtureCatalog = catalog.filter(entry => ['claude', 'voltagent'].includes(entry.slug))
    const result = filterCatalog(fixtureCatalog, { query: '', scheme: 'dark', category: 'ai-llm' })
    expect(result.map(x => x.slug)).toEqual(['voltagent'])
  })
})
