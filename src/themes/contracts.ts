export type ColorScheme = 'light' | 'dark'

export type ThemeTokens = Readonly<Record<string, string>>

export interface ThemeDefinition {
  readonly id: string
  readonly colorScheme: ColorScheme
  readonly tokens: ThemeTokens
}

export interface SourceDesign {
  readonly slug: string
  readonly name: string
  readonly description: string
  readonly category: string
  readonly colors: Readonly<Record<string, string>>
  readonly typography: Readonly<Record<string, Readonly<Record<string, unknown>>>>
  readonly sourcePath: string
  readonly sha256: string
}

export interface CanonicalPalette {
  readonly base: string
  readonly layer1: string
  readonly layer2: string
  readonly layer3: string
  readonly overlay: string
  readonly textPrimary: string
  readonly textSecondary: string
  readonly textTertiary: string
  readonly accent: string
  readonly border1: string
  readonly border2: string
  readonly success: string
  readonly warning: string
  readonly error: string
}

export interface NormalizedTheme {
  readonly slug: string
  readonly displayName: string
  readonly description: string
  readonly category: string
  readonly colorScheme: ColorScheme
  readonly palette: CanonicalPalette
  readonly fontKind: 'sans' | 'serif' | 'mono'
  readonly codeFontKind: 'mono'
  readonly shadow: 'none' | 'soft' | 'strong'
  /** Foreground roles whose source value required WCAG correction. */
  readonly adjustedForegroundTokens: readonly string[]
  readonly sourcePath: string
  readonly sourceSha256: string
}

export interface ThemeCatalogEntry {
  readonly id: string
  readonly slug: string
  readonly name: string
  readonly description: string
  readonly category: string
  readonly colorScheme: ColorScheme
  readonly preview: Readonly<{
    base: string
    layer: string
    sidebar: string
    text: string
    accent: string
  }>
  readonly theme: ThemeDefinition
}
