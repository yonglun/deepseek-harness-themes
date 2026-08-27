import { describe, expect, it } from 'vitest'
import {
  CONTRAST_PAIRS,
  REQUIRED_THEME_TOKENS,
  THEME_TOKEN_NAMES,
} from '../config/theme-tokens.ts'

describe('theme token contract', () => {
  it('contains only public semantic, specific, font, and shadow tokens', () => {
    expect(new Set(THEME_TOKEN_NAMES).size).toBe(THEME_TOKEN_NAMES.length)
    expect(THEME_TOKEN_NAMES.every(name => /^--dsw-(alias|specific|font|shadow)-/.test(name))).toBe(true)
    expect(REQUIRED_THEME_TOKENS.every(name => THEME_TOKEN_NAMES.includes(name))).toBe(true)
  })

  it('defines contrast coverage for each required text role', () => {
    expect(CONTRAST_PAIRS.length).toBeGreaterThan(0)
    expect(CONTRAST_PAIRS.every(pair => THEME_TOKEN_NAMES.some(name => name === pair.foreground))).toBe(true)
    expect(CONTRAST_PAIRS.every(pair => THEME_TOKEN_NAMES.some(name => name === pair.background))).toBe(true)
    expect(CONTRAST_PAIRS.some(pair => pair.minimum === 4.5)).toBe(true)
    expect(CONTRAST_PAIRS.some(pair => pair.minimum === 3)).toBe(true)
  })
})
