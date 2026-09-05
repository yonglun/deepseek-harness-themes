import type { ThemeCatalogEntry } from '../../src/themes/contracts.ts'

export type SiteTheme = Pick<ThemeCatalogEntry, 'id' | 'slug' | 'name' | 'category' | 'colorScheme' | 'preview'>
export interface ThemeFilter {
  query?: string
  scheme?: 'all' | 'light' | 'dark'
  category?: string
}
export const featuredSlugs: string[]
export function filterThemes<T extends SiteTheme>(themes: readonly T[], filter?: ThemeFilter): T[]
export function validateThemes(themes: unknown): SiteTheme[]
export function applyPalette(element: HTMLElement, palette: SiteTheme['preview']): void
