import { describe, expect, it } from 'vitest'
import { contrastRatio, correctForeground, mixColors } from '../src/themes/colors.ts'

describe('color utilities', () => {
  it('moves only OKLCH lightness to reach AA', () => {
    const corrected = correctForeground('#777777', ['#ffffff'], 4.5)
    expect(contrastRatio(corrected, '#ffffff')).toBeGreaterThanOrEqual(4.5)
    expect(corrected).toMatch(/^#[0-9a-f]{6}$/)
  })

  it('composites alpha colors over a target surface', () => {
    expect(contrastRatio('rgba(0,0,0,0.5)', '#ffffff')).toBeGreaterThan(2)
    expect(mixColors('#ffffff', '#000000', 0.1)).toBe('#dedede')
  })

  it('reports impossible correction attempts', () => {
    expect(() => correctForeground('#777777', ['#ffffff', '#000000'], 4.5)).toThrow(/contrast correction failed/)
  })
})
