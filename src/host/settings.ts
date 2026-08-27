import Schema from '@deepseek-ai/schemastery'
import type { HostContext } from '../runtime/contracts.ts'

export const THEMES_NAMESPACE = 'deepseek-harness-design-md-themes'
export const THEME_SELECTION_FIELD = 'selection'
export interface ThemePreferenceSettings {
  readonly selection: string
}

export const ThemePreferenceSchema = Schema.object({
  selection: Schema.string().default('system'),
})

export const inject = ['settings'] as const

export function apply(ctx: HostContext): void {
  ctx.inject(inject, settingsCtx => {
    settingsCtx.settings.register(THEMES_NAMESPACE, ThemePreferenceSchema)
  })
}
