import { describe, expect, it, vi } from 'vitest'
import { apply } from '../src/client.ts'
import { catalog } from '../src/themes/generated/catalog.ts'

function makeClientBench(options: { collideAt?: number; durable?: string } = {}) {
  const operations: string[] = []
  const themeDisposers = catalog.map(() => vi.fn())
  const registerTheme = vi.fn((_definition: unknown) => {
    operations.push('register-theme')
    const index = registerTheme.mock.calls.length
    if (options.collideAt === index) throw new Error('theme collision')
    return themeDisposers[index - 1]!
  })
  let preference = 'system'
  const offThemeChange = vi.fn()
  const localeDispose = vi.fn()
  const sectionDispose = vi.fn()
  const disposeStyles = vi.fn()
  const effectCleanups: Array<() => void> = []
  const registerSection = vi.fn((..._args: unknown[]) => sectionDispose)
  const ctx = {
    theme: {
      register: registerTheme,
      setTheme: vi.fn((id: string) => { operations.push(id === 'design-md-claude' ? 'restore' : 'set-theme'); preference = id }),
      getTheme: () => ({ preference, active: catalog.find(entry => entry.id === preference)?.theme ?? catalog[0]!.theme, themes: catalog.map(entry => entry.theme), revision: 1 }),
    },
    settingsScope: {
      bind: vi.fn(() => ({ getSnapshot: () => ({ value: { selection: options.durable ?? 'system' }, revision: 1 }), set: vi.fn(() => Promise.resolve()), subscribe: vi.fn(() => () => undefined) })),
    },
    slots: {
      inject: vi.fn((_name: string, factory: () => unknown) => factory()),
      register: registerSection,
    },
    locale: { register: vi.fn(() => localeDispose), t: vi.fn(() => 'Themes') },
    effect: vi.fn((setup: () => void | (() => void)) => { const cleanup = setup(); if (typeof cleanup === 'function') effectCleanups.push(cleanup) }),
    on: vi.fn((_event: 'theme/change', _listener: unknown) => offThemeChange),
  }
  return { ctx, operations, registerTheme, registerSection, themeDisposers, localeDispose, sectionDispose, offThemeChange, disposeStyles, disposeFiber: () => { for (const cleanup of [...effectCleanups].reverse()) cleanup() } }
}

describe('client plugin assembly', () => {
  it('registers 74 themes before one settings.section contribution and restore', () => {
    const b = makeClientBench({ durable: 'design-md-claude' })
    apply(b.ctx)
    expect(b.registerTheme).toHaveBeenCalledTimes(74)
    expect(b.registerSection).toHaveBeenCalledTimes(1)
    expect(b.operations.indexOf('restore')).toBeGreaterThan(b.operations.lastIndexOf('register-theme'))
  })

  it('uses a stable id and localized label thunk', () => {
    const b = makeClientBench()
    apply(b.ctx)
    const options = b.registerSection.mock.calls[0]![0] as { name: string; id: string; label: () => string }
    expect(options.name).toBe('settings.section')
    expect(options.id).toBe('design-md-themes')
    expect(options.label()).toBe('Themes')
  })

  it('removes every owned contribution on dispose', () => {
    const b = makeClientBench()
    apply(b.ctx)
    b.disposeFiber()
    expect(b.themeDisposers.every(dispose => dispose.mock.calls.length === 1)).toBe(true)
    expect(b.localeDispose).toHaveBeenCalledOnce()
    expect(b.sectionDispose).toHaveBeenCalledOnce()
    expect(b.offThemeChange).toHaveBeenCalledOnce()
  })

  it('leaves no section when theme registration collides', () => {
    const b = makeClientBench({ collideAt: 2 })
    expect(() => apply(b.ctx)).toThrow('theme collision')
    expect(b.registerSection).not.toHaveBeenCalled()
    expect(b.themeDisposers[0]).toHaveBeenCalledOnce()
  })
})
