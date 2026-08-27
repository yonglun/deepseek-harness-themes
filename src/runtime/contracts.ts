import type { ThemeDefinition, ThemeCatalogEntry } from '../themes/contracts.ts'

export interface ThemeSnapshot {
  readonly preference: string
  readonly active: ThemeDefinition
  readonly themes: readonly ThemeDefinition[]
  readonly revision: number
}

export interface ThemeService {
  register(definition: ThemeDefinition): () => void
  setTheme(id: string): void
  getTheme(): ThemeSnapshot
}

export interface SettingsRegistrar {
  register(namespace: string, schema: unknown): unknown
}

export interface HostSettingsContext {
  readonly settings: SettingsRegistrar
}

export interface HostContext {
  inject(dependencies: readonly ['settings'], callback: (ctx: HostSettingsContext) => void): unknown
}

export function catalogIds(catalog: readonly ThemeCatalogEntry[]): ReadonlySet<string> {
  return new Set(catalog.map(entry => entry.id))
}
