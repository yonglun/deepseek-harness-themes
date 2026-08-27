import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { parseDesign } from '../src/themes/parse-design.ts'
import { normalizeTheme } from '../src/themes/normalize.ts'
import { compileTheme, auditTheme } from '../src/themes/compile.ts'

const fixtureRoot = resolve(process.cwd(), 'tests/fixtures/awesome-design-md')

describe('compileTheme', () => {
  it('emits a namespaced, frozen ThemeDefinition and token-derived preview', async () => {
    const source = await parseDesign({ root: fixtureRoot, relativePath: 'design-md/claude/DESIGN.md', category: 'ai-llm' })
    const normalized = normalizeTheme(source, { reason: 'fixture', fontKind: 'serif' })
    const entry = compileTheme(normalized)
    expect(entry.id).toBe('design-md-claude')
    expect(entry.theme.colorScheme).toBe('light')
    expect(entry.preview).toEqual({
      base: entry.theme.tokens['--dsw-alias-bg-base'],
      layer: entry.theme.tokens['--dsw-alias-bg-layer-1'],
      sidebar: entry.theme.tokens['--dsw-specific-sidebar-fill'],
      text: entry.theme.tokens['--dsw-alias-label-primary'],
      accent: entry.theme.tokens['--dsw-alias-brand-primary'],
    })
    expect(Object.isFrozen(entry)).toBe(true)
    expect(Object.isFrozen(entry.theme)).toBe(true)
    expect(Object.isFrozen(entry.theme.tokens)).toBe(true)
    expect(auditTheme(entry)).toEqual([])
  })
})
