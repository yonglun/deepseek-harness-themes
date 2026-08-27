import { CONTRAST_PAIRS, THEME_TOKEN_NAMES, type ThemeTokenName } from '../config/theme-tokens.ts'
import type { NormalizedTheme, ThemeCatalogEntry, ThemeDefinition } from './contracts.ts'
import { contrastRatio, mixColors } from './colors.ts'

export const SYSTEM_FONTS = Object.freeze({
  sans: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  serif: 'ui-serif, Georgia, Cambria, "Times New Roman", serif',
  mono: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
})

export interface ContrastFailure {
  readonly foreground: ThemeTokenName
  readonly background: ThemeTokenName
  readonly minimum: number
  readonly ratio: number
}

function deepFreeze<T>(value: T): T {
  if (typeof value !== 'object' || value === null || Object.isFrozen(value)) return value
  for (const child of Object.values(value as Record<string, unknown>)) deepFreeze(child)
  return Object.freeze(value)
}

function shadowTokens(shadow: NormalizedTheme['shadow']): Record<string, string> {
  if (shadow === 'none') return {
    '--dsw-shadow-lv1': 'none',
    '--dsw-shadow-lv1-blur': 'none',
    '--dsw-shadow-lv2': 'none',
    '--dsw-shadow-lv3': 'none',
  }
  if (shadow === 'strong') return {
    '--dsw-shadow-lv1': '0 1px 2px rgba(0, 0, 0, 0.18)',
    '--dsw-shadow-lv1-blur': '0 2px 8px rgba(0, 0, 0, 0.16)',
    '--dsw-shadow-lv2': '0 8px 24px rgba(0, 0, 0, 0.2)',
    '--dsw-shadow-lv3': '0 16px 48px rgba(0, 0, 0, 0.24)',
  }
  return {
    '--dsw-shadow-lv1': '0 1px 2px rgba(0, 0, 0, 0.08)',
    '--dsw-shadow-lv1-blur': '0 2px 8px rgba(0, 0, 0, 0.08)',
    '--dsw-shadow-lv2': '0 8px 24px rgba(0, 0, 0, 0.1)',
    '--dsw-shadow-lv3': '0 16px 40px rgba(0, 0, 0, 0.12)',
  }
}

function tokenMap(normalized: NormalizedTheme): Record<ThemeTokenName, string> {
  const p = normalized.palette
  const hover = mixColors(p.accent, p.base, 0.08)
  const active = mixColors(p.accent, p.base, 0.14)
  const tokens: Record<string, string> = {
    '--dsw-alias-bg-base': p.base,
    '--dsw-alias-bg-layer-1': p.layer1,
    '--dsw-alias-bg-layer-2': p.layer2,
    '--dsw-alias-bg-layer-3': p.layer3,
    '--dsw-alias-bg-overlay': p.overlay,
    '--dsw-alias-label-primary': p.textPrimary,
    '--dsw-alias-label-secondary': p.textSecondary,
    '--dsw-alias-label-tertiary': p.textTertiary,
    '--dsw-alias-brand-primary': p.accent,
    '--dsw-alias-state-business-primary': p.accent,
    '--dsw-alias-state-success-primary': p.success,
    '--dsw-alias-state-warn-primary': p.warning,
    '--dsw-alias-state-error-primary': p.error,
    '--dsw-alias-border-l1': p.border1,
    '--dsw-alias-border-l2': p.border2,
    '--dsw-alias-interactive-bg-hover': hover,
    '--dsw-alias-interactive-bg-active': active,
    '--dsw-alias-button-primary-fill': p.accent,
    '--dsw-alias-button-primary-hover': hover,
    '--dsw-alias-markdown-code-block': p.layer3,
    '--dsw-alias-markdown-code-block-banner': p.layer2,
    '--dsw-alias-markdown-inline-code': mixColors(p.layer1, p.textPrimary, 0.1),
    '--dsw-alias-markdown-tag': p.accent,
    '--dsw-alias-scrollbar-bg-l1': p.layer2,
    '--dsw-alias-scrollbar-hover-l1': p.layer3,
    '--dsw-alias-tooltip-bg': p.overlay,
    '--dsw-specific-bubble': p.layer1,
    '--dsw-specific-bubble-highlight': mixColors(p.layer1, p.accent, 0.2),
    '--dsw-specific-sidebar-fill': p.layer1,
    '--dsw-specific-sidebar-nav-item-active': mixColors(p.layer1, p.accent, 0.14),
    '--dsw-font-family': SYSTEM_FONTS[normalized.fontKind],
    '--dsw-font-markdown-code-font-family': SYSTEM_FONTS.mono,
    '--dsw-font-markdown-code-block-font-family': SYSTEM_FONTS[normalized.codeFontKind],
    ...shadowTokens(normalized.shadow),
  }
  const expected = new Set<string>(THEME_TOKEN_NAMES)
  const actual = new Set(Object.keys(tokens))
  if (actual.size !== expected.size || [...expected].some(name => !actual.has(name))) throw new Error(`compile ${normalized.slug}: token map is incomplete`)
  if ([...actual].some(name => !expected.has(name))) throw new Error(`compile ${normalized.slug}: token map contains an unknown token`)
  for (const [name, value] of Object.entries(tokens)) if (typeof value !== 'string') throw new Error(`compile ${normalized.slug}: ${name} must be a string`)
  return tokens as Record<ThemeTokenName, string>
}

export function auditTheme(entry: ThemeCatalogEntry): ContrastFailure[] {
  const failures: ContrastFailure[] = []
  for (const pair of CONTRAST_PAIRS) {
    const foreground = pair.foreground as ThemeTokenName
    const background = pair.background as ThemeTokenName
    const ratio = contrastRatio(entry.theme.tokens[foreground]!, entry.theme.tokens[background]!)
    if (ratio + 1e-9 < pair.minimum) failures.push({ foreground, background, minimum: pair.minimum, ratio })
  }
  return failures
}

export function compileTheme(normalized: NormalizedTheme): ThemeCatalogEntry {
  if (!/^[a-z0-9]+(?:[.-][a-z0-9]+)*$/.test(normalized.slug) || new Set(['light', 'dark', 'system']).has(normalized.slug)) {
    throw new Error(`compile ${normalized.slug}: invalid theme slug`)
  }
  const tokens = deepFreeze(tokenMap(normalized))
  const theme: ThemeDefinition = deepFreeze({
    id: `design-md-${normalized.slug}`,
    colorScheme: normalized.colorScheme,
    tokens,
  })
  const preview = deepFreeze({
    base: tokens['--dsw-alias-bg-base'],
    layer: tokens['--dsw-alias-bg-layer-1'],
    sidebar: tokens['--dsw-specific-sidebar-fill'],
    text: tokens['--dsw-alias-label-primary'],
    accent: tokens['--dsw-alias-brand-primary'],
  })
  const entry = deepFreeze({
    id: theme.id,
    slug: normalized.slug,
    name: normalized.displayName,
    description: normalized.description,
    category: normalized.category,
    colorScheme: normalized.colorScheme,
    preview,
    theme,
  }) as ThemeCatalogEntry
  const failures = auditTheme(entry)
  if (failures.length > 0) throw new Error(`compile ${normalized.slug}: ${failures.length} contrast failures ${failures.map(failure => `${failure.foreground} on ${failure.background}=${failure.ratio.toFixed(2)}`).join('; ')}`)
  return entry
}
