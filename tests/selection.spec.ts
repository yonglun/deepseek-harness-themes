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
    getSnapshot: () => ({ value: { selection: durable }, revision: 1 }),
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
