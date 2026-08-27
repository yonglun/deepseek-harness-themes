import { describe, expect, it, vi } from 'vitest'
import { catalog } from '../src/themes/generated/catalog.ts'
import { registerCatalog } from '../src/runtime/register.ts'

describe('registerCatalog', () => {
  it('rolls back earlier registrations when a later id collides', () => {
    const disposeFirst = vi.fn()
    const theme = {
      register: vi.fn().mockReturnValueOnce(disposeFirst).mockImplementationOnce(() => { throw new Error('collision') }),
    }
    expect(() => registerCatalog(theme, catalog.slice(0, 2))).toThrow('collision')
    expect(disposeFirst).toHaveBeenCalledOnce()
  })

  it('disposes all registrations in reverse order', () => {
    const disposeFirst = vi.fn()
    const disposeSecond = vi.fn()
    const theme = { register: vi.fn().mockReturnValueOnce(disposeFirst).mockReturnValueOnce(disposeSecond) }
    const dispose = registerCatalog(theme, catalog.slice(0, 2))
    dispose()
    expect(disposeSecond).toHaveBeenCalledOnce()
    expect(disposeFirst).toHaveBeenCalledOnce()
  })
})
