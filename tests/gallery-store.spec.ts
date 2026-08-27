import { describe, expect, it, vi } from 'vitest'
import { createGalleryStore } from '../src/gallery/store.ts'
import type { SelectionState } from '../src/runtime/selection.ts'

const selection: SelectionState = { preference: 'system', activeId: 'system', revision: 0, persistence: 'idle', managedByOtherPlugin: false }

describe('createGalleryStore', () => {
  it('owns filters and mirrors the latest selection snapshot', () => {
    const store = createGalleryStore(selection)
    const listener = vi.fn()
    store.subscribe(listener)
    store.setQuery(' Claude ')
    store.setScheme('dark')
    store.setCategory('ai-llm')
    store.syncSelection({ ...selection, preference: 'design-md-claude', activeId: 'design-md-claude', revision: 1 })
    expect(store.getSnapshot()).toMatchObject({ query: ' Claude ', scheme: 'dark', category: 'ai-llm', selection: { activeId: 'design-md-claude' } })
    expect(listener).toHaveBeenCalledTimes(4)
  })
})
