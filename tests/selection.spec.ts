import { describe, expect, it, vi } from 'vitest'
import { createSelectionController, type SelectionController } from '../src/runtime/selection.ts'
import type { ThemeSnapshot } from '../src/runtime/contracts.ts'

const owned = new Set(['design-md-claude', 'design-md-voltagent'])

function snapshot(preference: string, revision = 1): ThemeSnapshot {
  return {
    preference,
    active: { id: preference, colorScheme: preference === 'dark' ? 'dark' : 'light', tokens: {} },
    themes: [],
    revision,
  }
}

function makeBench(options: {
  current: string
  durable: string
  deferredWrites?: boolean
  rejectWrite?: boolean
}): {
  controller: SelectionController
  setTheme: ReturnType<typeof vi.fn>
  settingsSet: ReturnType<typeof vi.fn>
  resolveNextWrite: () => void
  allowWrites: () => void
  flushWrites: () => Promise<void>
} {
  let current = options.current
  let durable = options.durable
  let reject = options.rejectWrite ?? false
  const pending: Array<() => void> = []
  const setTheme = vi.fn((id: string) => { current = id })
  const settingsSet = vi.fn((_field: string, value: string) => {
    if (reject) return Promise.reject(new Error('offline'))
    if (!options.deferredWrites) {
      durable = value
      return Promise.resolve()
    }
    return new Promise<void>(resolve => pending.push(() => { durable = value; resolve() }))
  })
  const settings = {
    getSnapshot: () => ({ status: 'ready' as const, value: { selection: durable }, base: undefined, user: undefined, revision: 1, writable: true, mode: 'host' as const }),
    set: settingsSet,
    subscribe: vi.fn(() => () => undefined),
  }
  const controller = createSelectionController({
    theme: {
      getTheme: () => snapshot(current),
      setTheme,
    },
    settings,
    ownedIds: owned,
  })
  return {
    controller,
    setTheme,
    settingsSet,
    resolveNextWrite: () => pending.shift()?.(),
    allowWrites: () => { reject = false },
    flushWrites: async () => { await Promise.resolve(); await Promise.resolve() },
  }
}

describe('selection controller', () => {
  it('reasserts a custom selection when host adoption echoes a built-in during persistence', async () => {
    const b = makeBench({ current: 'dark', durable: 'dark', deferredWrites: true })

    b.controller.select('design-md-claude')
    b.controller.sync(snapshot('dark', 2))
    await Promise.resolve()

    expect(b.setTheme).toHaveBeenNthCalledWith(1, 'design-md-claude')
    expect(b.setTheme).toHaveBeenNthCalledWith(2, 'design-md-claude')
    expect(b.controller.getSnapshot().preference).toBe('design-md-claude')
    expect(b.settingsSet).toHaveBeenCalledTimes(1)
  })

  it('reasserts after the settings write resolves but before delayed host adoption', async () => {
    const b = makeBench({ current: 'dark', durable: 'dark' })

    b.controller.select('design-md-claude')
    await Promise.resolve()
    b.controller.sync(snapshot('dark', 2))
    await Promise.resolve()

    expect(b.setTheme).toHaveBeenNthCalledWith(2, 'design-md-claude')
    expect(b.controller.getSnapshot().preference).toBe('design-md-claude')
  })

  it('defers restore until the settings scope has a value', () => {
    let ready = false
    let notify = (): void => undefined
    const setTheme = vi.fn()
    const settings = {
      getSnapshot: () => ready
        ? { status: 'ready' as const, value: { selection: 'design-md-claude' }, base: undefined, user: undefined, revision: 1, writable: true, mode: 'host' as const }
        : { status: 'loading' as const, value: undefined, base: undefined, user: undefined, revision: undefined, writable: false, mode: 'host' as const },
      set: vi.fn(() => Promise.resolve()),
      subscribe: vi.fn((listener: () => void) => { notify = listener; return () => undefined }),
    }
    const controller = createSelectionController({
      theme: { getTheme: () => snapshot('system'), setTheme },
      settings,
      ownedIds: owned,
    })

    expect(() => controller.restore()).not.toThrow()
    expect(setTheme).not.toHaveBeenCalled()
    ready = true
    notify()
    expect(setTheme).toHaveBeenCalledWith('design-md-claude')
  })

  it('restores an owned persisted id only over a built-in current preference', () => {
    const b = makeBench({ current: 'system', durable: 'design-md-claude' })
    b.controller.restore()
    expect(b.setTheme).toHaveBeenCalledWith('design-md-claude')
  })

  it('does not replace another plugin third-party preference during restore', () => {
    const b = makeBench({ current: 'other-plugin-theme', durable: 'design-md-claude' })
    b.controller.restore()
    expect(b.setTheme).not.toHaveBeenCalled()
    expect(b.controller.getSnapshot().managedByOtherPlugin).toBe(true)
  })

  it('serializes rapid writes in gesture order', async () => {
    const b = makeBench({ current: 'system', durable: 'system', deferredWrites: true })
    b.controller.select('design-md-claude')
    b.controller.select('design-md-voltagent')
    expect(b.settingsSet).toHaveBeenCalledTimes(1)
    b.resolveNextWrite()
    await Promise.resolve()
    expect(b.settingsSet).toHaveBeenNthCalledWith(2, 'selection', 'design-md-voltagent')
  })

  it('mirrors native light changes but ignores unknown third-party changes', async () => {
    const b = makeBench({ current: 'design-md-claude', durable: 'design-md-claude' })
    b.controller.sync(snapshot('light', 2))
    await b.flushWrites()
    expect(b.settingsSet).toHaveBeenLastCalledWith('selection', 'light')
    b.settingsSet.mockClear()
    b.controller.sync(snapshot('other-plugin-theme', 3))
    await b.flushWrites()
    expect(b.settingsSet).not.toHaveBeenCalled()
  })

  it('clears an invalid persisted id and selects system', async () => {
    const b = makeBench({ current: 'light', durable: 'removed-theme' })
    b.controller.restore()
    await b.flushWrites()
    expect(b.setTheme).toHaveBeenCalledWith('system')
    expect(b.settingsSet).toHaveBeenCalledWith('selection', 'system')
  })

  it('keeps the session theme and exposes retry after persistence failure', async () => {
    const b = makeBench({ current: 'system', durable: 'system', rejectWrite: true })
    b.controller.select('design-md-claude')
    await b.flushWrites()
    expect(b.setTheme).toHaveBeenCalledWith('design-md-claude')
    expect(b.controller.getSnapshot().persistence).toBe('error')
    b.allowWrites()
    b.controller.retry()
    await b.flushWrites()
    expect(b.controller.getSnapshot().persistence).toBe('idle')
  })
})
