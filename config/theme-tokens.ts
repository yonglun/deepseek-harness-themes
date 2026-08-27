import type { ColorScheme } from '../src/themes/contracts.ts'

export const REQUIRED_THEME_TOKENS = [
  '--dsw-alias-bg-base',
  '--dsw-alias-bg-layer-1',
  '--dsw-alias-bg-layer-2',
  '--dsw-alias-bg-layer-3',
  '--dsw-alias-bg-overlay',
  '--dsw-alias-label-primary',
  '--dsw-alias-label-secondary',
  '--dsw-alias-label-tertiary',
  '--dsw-alias-brand-primary',
  '--dsw-alias-state-business-primary',
  '--dsw-alias-state-success-primary',
  '--dsw-alias-state-warn-primary',
  '--dsw-alias-state-error-primary',
  '--dsw-alias-border-l1',
  '--dsw-alias-border-l2',
  '--dsw-alias-interactive-bg-hover',
  '--dsw-alias-interactive-bg-active',
  '--dsw-alias-button-primary-fill',
  '--dsw-alias-button-primary-hover',
  '--dsw-alias-markdown-code-block',
  '--dsw-alias-markdown-code-block-banner',
  '--dsw-alias-markdown-inline-code',
  '--dsw-alias-markdown-tag',
  '--dsw-alias-scrollbar-bg-l1',
  '--dsw-alias-scrollbar-hover-l1',
  '--dsw-alias-tooltip-bg',
  '--dsw-specific-bubble',
  '--dsw-specific-bubble-highlight',
  '--dsw-specific-sidebar-fill',
  '--dsw-specific-sidebar-nav-item-active',
] as const

export const THEME_TOKEN_NAMES = [
  ...REQUIRED_THEME_TOKENS,
  '--dsw-font-family',
  '--dsw-font-markdown-code-font-family',
  '--dsw-font-markdown-code-block-font-family',
  '--dsw-shadow-lv1',
  '--dsw-shadow-lv1-blur',
  '--dsw-shadow-lv2',
  '--dsw-shadow-lv3',
] as const

export const CONTRAST_SURFACES = [
  '--dsw-alias-bg-base',
  '--dsw-alias-bg-layer-1',
  '--dsw-alias-bg-layer-2',
  '--dsw-specific-bubble',
  '--dsw-alias-markdown-code-block',
  '--dsw-specific-sidebar-fill',
] as const

const ACCENT_FOREGROUNDS = [
  '--dsw-alias-brand-primary',
  '--dsw-alias-state-business-primary',
  '--dsw-alias-state-success-primary',
  '--dsw-alias-state-warn-primary',
  '--dsw-alias-state-error-primary',
] as const

export const CONTRAST_PAIRS = [
  ...CONTRAST_SURFACES.flatMap(surface => [
    { foreground: '--dsw-alias-label-primary', background: surface, minimum: 4.5 },
    { foreground: '--dsw-alias-label-secondary', background: surface, minimum: 4.5 },
    { foreground: '--dsw-alias-label-tertiary', background: surface, minimum: 3 },
  ]),
  ...ACCENT_FOREGROUNDS.map(foreground => ({
    foreground,
    background: '--dsw-alias-bg-base',
    minimum: 3,
  })),
] as const

export type ThemeTokenName = (typeof THEME_TOKEN_NAMES)[number]
export type RequiredThemeToken = (typeof REQUIRED_THEME_TOKENS)[number]
export type ContrastPair = (typeof CONTRAST_PAIRS)[number]

export interface ThemeTokenRecord {
  readonly colorScheme: ColorScheme
  readonly tokens: Readonly<Record<ThemeTokenName, string>>
}
