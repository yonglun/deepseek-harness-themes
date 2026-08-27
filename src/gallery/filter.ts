import type { ThemeCatalogEntry } from '../themes/contracts.ts'

export interface GalleryFilter {
  readonly query: string
  readonly scheme: 'all' | 'light' | 'dark'
  readonly category: string
}

export function filterCatalog(catalog: readonly ThemeCatalogEntry[], filter: GalleryFilter): ThemeCatalogEntry[] {
  const query = filter.query.trim().toLocaleLowerCase()
  return catalog.filter(entry => {
    if (filter.scheme !== 'all' && entry.colorScheme !== filter.scheme) return false
    if (filter.category !== 'all' && entry.category !== filter.category) return false
    if (query.length === 0) return true
    return [entry.name, entry.slug, entry.category, entry.description]
      .some(value => value.toLocaleLowerCase().includes(query))
  })
}
