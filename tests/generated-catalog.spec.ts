import { describe, expect, it } from 'vitest'
import { auditTheme } from '../src/themes/compile.ts'
import { catalog } from '../src/themes/generated/catalog.ts'

describe('generated catalog', () => {
  it('ships exactly the pinned 74 accessible themes', () => {
    expect(catalog).toHaveLength(74)
    expect(new Set(catalog.map(entry => entry.id)).size).toBe(74)
    expect(catalog.every(entry => auditTheme(entry).length === 0)).toBe(true)
  })
})
