import Schema from '@deepseek-ai/schemastery'
import type { HostContext } from '../runtime/contracts.ts'
import { THEMES_NAMESPACE, THEME_SELECTION_FIELD, type ThemePreferenceSettings } from '../runtime/identity.ts'

export { THEMES_NAMESPACE, THEME_SELECTION_FIELD }
export type { ThemePreferenceSettings }

export const ThemePreferenceSchema = Schema.object({
  selection: Schema.string().default('system'),
})

export const inject = ['settings'] as const

export function apply(ctx: HostContext): void {
  ctx.inject(inject, settingsCtx => {
    settingsCtx.settings.register(THEMES_NAMESPACE, ThemePreferenceSchema)
  })
}
