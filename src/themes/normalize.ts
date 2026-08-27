import type { CanonicalPalette, ColorScheme, NormalizedTheme, SourceDesign } from './contracts.ts'
import { contrastRatio, correctForeground, mixColors } from './colors.ts'
import type { ThemeOverride } from './overrides.ts'

const ROLE_KEYS: Readonly<Record<keyof CanonicalPalette, readonly string[]>> = {
  base: ['canvas', 'canvas-dark', 'canvas-night', 'canvas-light', 'background', 'bg', 'surface-base', 'surface-black'],
  layer1: ['surface-soft', 'surface-card', 'surface', 'surface-pearl', 'surface-light'],
  layer2: ['surface-strong', 'surface-elevated', 'surface-elevated-dark', 'surface-card-dark'],
  layer3: ['surface-deep', 'surface-dark', 'surface-dark-elevated', 'surface-black'],
  overlay: ['scrim', 'overlay', 'surface-overlay', 'frosted-glass'],
  textPrimary: ['ink', 'text', 'body', 'foreground', 'body-on-light', 'on-dark'],
  textSecondary: ['body-strong', 'muted-strong', 'muted', 'ink-muted', 'body-muted', 'on-dark-soft'],
  textTertiary: ['muted-soft', 'muted', 'body-muted', 'ink-muted-48', 'disabled'],
  accent: ['primary', 'brand', 'accent', 'action', 'link', 'link-blue', 'electric-blue'],
  border1: ['hairline', 'divider-soft', 'border', 'hairline-soft'],
  border2: ['hairline-strong', 'border-strong', 'divider', 'border'],
  success: ['success', 'semantic-success', 'trading-up', 'positive'],
  warning: ['warning', 'semantic-warning', 'trading-warning', 'caution'],
  error: ['error', 'semantic-error', 'trading-down', 'danger'],
}

function firstColor(colors: Readonly<Record<string, string>>, keys: readonly string[]): string | undefined {
  for (const key of keys) if (colors[key] !== undefined) return colors[key]
  return undefined
}

function firstSurfaceColor(
  colors: Readonly<Record<string, string>>,
  keys: readonly string[],
  scheme: ColorScheme,
): string | undefined {
  const candidates = keys.map(key => colors[key]).filter((value): value is string => value !== undefined)
  const suitable = candidates.filter(value => {
    try {
      const darker = contrastRatio('#000000', value) > contrastRatio('#ffffff', value)
      return scheme === 'light' ? darker : !darker
    } catch {
      return false
    }
  })
  return suitable[0]
}

function bestContrast(colors: Readonly<Record<string, string>>, background: string): string {
  const candidates = Object.values(colors)
  return candidates
    .filter(value => {
      try {
        contrastRatio(value, background)
        return true
      } catch {
        return false
      }
    })
    .sort((a, b) => contrastRatio(b, background) - contrastRatio(a, background))[0] ?? '#141413'
}

function inferScheme(base: string): ColorScheme {
  return contrastRatio('#ffffff', base) > contrastRatio('#000000', base) ? 'dark' : 'light'
}

function inferFont(source: SourceDesign): 'sans' | 'serif' | 'mono' {
  const familyText = JSON.stringify(source.typography).toLocaleLowerCase()
  if (/mono|courier|consolas|code/.test(familyText)) return 'mono'
  if (/serif|georgia|times|baskerville|garamond/.test(familyText)) return 'serif'
  return 'sans'
}

function applyOverrideRole(
  role: keyof CanonicalPalette,
  source: SourceDesign,
  override: ThemeOverride | undefined,
  fallback: string,
): string {
  const sourceKey = override?.sourceRoles?.[role]
  if (sourceKey !== undefined && source.colors[sourceKey] !== undefined) return source.colors[sourceKey]
  const literal = override?.roles?.[role]
  return literal ?? fallback
}

export function normalizeTheme(source: SourceDesign, override?: ThemeOverride): NormalizedTheme {
  const base = applyOverrideRole('base', source, override, firstColor(source.colors, ROLE_KEYS.base) ?? '#ffffff')
  const colorScheme = override?.colorScheme ?? inferScheme(base)
  const preferredText = applyOverrideRole('textPrimary', source, override, firstColor(source.colors, ROLE_KEYS.textPrimary) ?? bestContrast(source.colors, base))
  const textSeed = (() => {
    try {
      return contrastRatio(preferredText, base) >= 4.5 ? preferredText : bestContrast(source.colors, base)
    } catch {
      return bestContrast(source.colors, base)
    }
  })()
  const accent = applyOverrideRole('accent', source, override, firstColor(source.colors, ROLE_KEYS.accent) ?? textSeed)
  const layer1 = applyOverrideRole('layer1', source, override, firstSurfaceColor(source.colors, ROLE_KEYS.layer1, colorScheme) ?? mixColors(base, textSeed, 0.03))
  const layer2 = applyOverrideRole('layer2', source, override, firstSurfaceColor(source.colors, ROLE_KEYS.layer2, colorScheme) ?? mixColors(base, textSeed, 0.06))
  const layer3 = applyOverrideRole('layer3', source, override, firstSurfaceColor(source.colors, ROLE_KEYS.layer3, colorScheme) ?? mixColors(base, textSeed, 0.1))
  const overlay = applyOverrideRole('overlay', source, override, firstColor(source.colors, ROLE_KEYS.overlay) ?? mixColors(base, textSeed, 0.24))
  const textSecondary = applyOverrideRole('textSecondary', source, override, firstColor(source.colors, ROLE_KEYS.textSecondary) ?? mixColors(textSeed, base, 0.35))
  const textTertiary = applyOverrideRole('textTertiary', source, override, firstColor(source.colors, ROLE_KEYS.textTertiary) ?? mixColors(textSeed, base, 0.55))
  const border1 = applyOverrideRole('border1', source, override, firstColor(source.colors, ROLE_KEYS.border1) ?? mixColors(base, textSeed, 0.14))
  const border2 = applyOverrideRole('border2', source, override, firstColor(source.colors, ROLE_KEYS.border2) ?? mixColors(base, textSeed, 0.24))
  const successSeed = applyOverrideRole('success', source, override, firstColor(source.colors, ROLE_KEYS.success) ?? '#15803d')
  const warningSeed = applyOverrideRole('warning', source, override, firstColor(source.colors, ROLE_KEYS.warning) ?? '#a16207')
  const errorSeed = applyOverrideRole('error', source, override, firstColor(source.colors, ROLE_KEYS.error) ?? '#b91c1c')
  const textBackgrounds = [base, layer1, layer2, layer3]
  const palette: CanonicalPalette = Object.freeze({
    base,
    layer1,
    layer2,
    layer3,
    overlay,
    textPrimary: correctForeground(textSeed, textBackgrounds, 4.5),
    textSecondary: correctForeground(textSecondary, textBackgrounds, 4.5),
    textTertiary: correctForeground(textTertiary, textBackgrounds, 3),
    accent: correctForeground(accent, [base], 3),
    border1,
    border2,
    success: correctForeground(successSeed, [base], 3),
    warning: correctForeground(warningSeed, [base], 3),
    error: correctForeground(errorSeed, [base], 3),
  })
  return Object.freeze({
    slug: source.slug,
    displayName: source.name.replace(/-design-analysis$/i, ''),
    description: source.description,
    category: source.category,
    colorScheme,
    palette,
    fontKind: override?.fontKind ?? inferFont(source),
    codeFontKind: 'mono',
    shadow: override?.shadow ?? 'soft',
    sourcePath: source.sourcePath,
    sourceSha256: source.sha256,
  })
}
