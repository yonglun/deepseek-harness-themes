import { describe, expect, it, vi } from 'vitest'
import { apply, THEMES_NAMESPACE } from '../src/host/settings.ts'

describe('host settings', () => {
  it('registers only the plugin-owned settings namespace', () => {
    const register = vi.fn()
    const hostContext = {
      inject: vi.fn((_deps: readonly ['settings'], callback: (ctx: { settings: { register: typeof register } }) => void) => callback({ settings: { register } })),
    }
    apply(hostContext)
    expect(register).toHaveBeenCalledWith(THEMES_NAMESPACE, expect.anything())
    expect(register).not.toHaveBeenCalledWith('ui-theme', expect.anything())
  })
})
