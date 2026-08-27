import { THEME_TOKEN_NAMES } from '../config/theme-tokens.ts'
import type { ThemeCatalogEntry } from '../themes/contracts.ts'
import type { ThemeService } from './contracts.ts'

function validateEntry(entry: ThemeCatalogEntry): void {
  if (!/^design-md-[a-z0-9]+(?:[.-][a-z0-9]+)*$/.test(entry.id)) throw new Error(`invalid theme id ${entry.id}`)
  if (entry.theme.id !== entry.id) throw new Error(`theme id mismatch ${entry.id}`)
  if (entry.theme.colorScheme !== 'light' && entry.theme.colorScheme !== 'dark') throw new Error(`invalid color scheme ${entry.id}`)
  const expected = new Set<string>(THEME_TOKEN_NAMES)
  const actual = Object.keys(entry.theme.tokens)
  if (actual.length !== expected.size || actual.some(token => !expected.has(token))) throw new Error(`invalid token map ${entry.id}`)
  if (actual.some(token => typeof entry.theme.tokens[token] !== 'string')) throw new Error(`non-string token ${entry.id}`)
}

export function validateRuntimeCatalog(entries: readonly ThemeCatalogEntry[]): void {
  const ids = new Set<string>()
  for (const entry of entries) {
    validateEntry(entry)
    if (ids.has(entry.id)) throw new Error(`duplicate theme id ${entry.id}`)
    ids.add(entry.id)
  }
}

export function registerCatalog(theme: Pick<ThemeService, 'register'>, entries: readonly ThemeCatalogEntry[]): () => void {
  validateRuntimeCatalog(entries)
  const disposers: Array<() => void> = []
  try {
    for (const entry of entries) disposers.push(theme.register(entry.theme))
  } catch (error) {
    for (const dispose of [...disposers].reverse()) dispose()
    throw error
  }
  return () => {
    for (const dispose of [...disposers].reverse()) dispose()
  }
}
