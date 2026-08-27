import type { SelectionState } from '../runtime/selection.ts'

export interface GalleryState {
  readonly query: string
  readonly scheme: 'all' | 'light' | 'dark'
  readonly category: string
  readonly selection: SelectionState
}

export interface GalleryStore {
  getSnapshot(): GalleryState
  subscribe(listener: () => void): () => void
  setQuery(query: string): void
  setScheme(scheme: GalleryState['scheme']): void
  setCategory(category: string): void
  syncSelection(selection: SelectionState): void
}

export function createGalleryStore(selection: SelectionState): GalleryStore {
  const listeners = new Set<() => void>()
  let state: GalleryState = Object.freeze({ query: '', scheme: 'all', category: 'all', selection })
  const update = (patch: Partial<GalleryState>): void => {
    state = Object.freeze({ ...state, ...patch })
    for (const listener of listeners) listener()
  }
  return {
    getSnapshot: () => state,
    subscribe: listener => { listeners.add(listener); return () => listeners.delete(listener) },
    setQuery: query => update({ query }),
    setScheme: scheme => update({ scheme }),
    setCategory: category => update({ category }),
    syncSelection: selection => update({ selection }),
  }
}
