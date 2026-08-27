import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { parseDesign } from '../src/themes/parse-design.ts'
import { loadThemeOverride } from '../src/themes/overrides.ts'
import { normalizeTheme } from '../src/themes/normalize.ts'

const fixtureRoot = resolve(process.cwd(), 'tests/fixtures/awesome-design-md')

describe('normalizeTheme', () => {
  it('normalizes Claude into one warm light theme', async () => {
    const claude = await parseDesign({ root: fixtureRoot, relativePath: 'design-md/claude/DESIGN.md', category: 'ai-llm' })
    const claudeOverride = { reason: 'Keep the source editorial serif voice.', fontKind: 'serif' as const }
    expect(normalizeTheme(claude, claudeOverride)).toMatchObject({
      slug: 'claude',
      colorScheme: 'light',
      fontKind: 'serif',
      palette: { base: '#faf9f5', accent: '#cc785c', textPrimary: '#141413' },
    })
  })

  it('loads sparse overrides with a required reason', async () => {
    const override = await loadThemeOverride(resolve(process.cwd(), 'theme-overrides/themes/claude.yaml'))
    expect(override).toMatchObject({ fontKind: 'serif' })
    expect(override.reason.length).toBeGreaterThan(0)
  })
})
