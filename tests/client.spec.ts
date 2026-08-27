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
  const translate = vi.fn((key: string) => key)
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
      bind: vi.fn(() => ({
        getSnapshot: () => ({
          status: 'ready' as const,
          value: { selection: options.durable ?? 'system' },
          base: undefined,
          user: undefined,
          revision: 1,
          writable: true,
          mode: 'host' as const,
        }),
        set: vi.fn(() => Promise.resolve()),
        subscribe: vi.fn(() => () => undefined),
      })),
    },
    slots: {
      inject: vi.fn((_name: string, factory: () => unknown) => factory()),
      register: registerSection,
    },
    locale: { register: vi.fn(() => localeDispose), bind: vi.fn(() => translate) },
    effect: vi.fn((setup: () => void | (() => void)) => { const cleanup = setup(); if (typeof cleanup === 'function') effectCleanups.push(cleanup) }),
    on: vi.fn((_event: 'theme/change', _listener: unknown) => offThemeChange),
  }
  return { ctx, operations, registerTheme, registerSection, themeDisposers, localeDispose, sectionDispose, offThemeChange, translate, disposeStyles, disposeFiber: () => { for (const cleanup of [...effectCleanups].reverse()) cleanup() } }
}

describe('client plugin assembly', () => {
  it('registers 74 themes before one settings.section contribution and restore', async () => {
    const b = makeClientBench({ durable: 'design-md-claude' })
    apply(b.ctx)
    await new Promise(resolve => setTimeout(resolve, 0))
    expect(b.registerTheme).toHaveBeenCalledTimes(74)
    expect(b.registerSection).toHaveBeenCalledTimes(1)
    expect(b.operations.indexOf('restore')).toBeGreaterThan(b.operations.lastIndexOf('register-theme'))
  })

  it('defers initial restore until the client effects have flushed', async () => {
    const b = makeClientBench({ durable: 'design-md-claude' })
    apply(b.ctx)
    await Promise.resolve()
    expect(b.operations).not.toContain('restore')
    await new Promise(resolve => setTimeout(resolve, 0))
    expect(b.operations).toContain('restore')
  })

  it('uses a stable id and localized label thunk', () => {
    const b = makeClientBench()
    apply(b.ctx)
    const options = b.registerSection.mock.calls[0]![0] as { name: string; id: string; label: () => string }
    expect(options.name).toBe('settings.section')
    expect(options.id).toBe('design-md-themes')
    expect(options.label()).toBe('title')
    expect(b.translate).toHaveBeenCalledWith('title')
  })

  it('uses the Harness locale bind contract instead of a nonexistent locale.t method', () => {
    const b = makeClientBench()
    expect(() => apply(b.ctx)).not.toThrow()
    expect(b.ctx.locale.bind).toHaveBeenCalledWith('settings.design-md-themes')
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
