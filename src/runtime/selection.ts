import type { ThemeService, ThemeSnapshot } from './contracts.ts'

export interface ThemePreferenceSettings {
  readonly selection: string
}

export interface SettingsScopeSnapshot {
  readonly value: ThemePreferenceSettings
  readonly revision: number
}

export interface SettingsScope {
  getSnapshot(): SettingsScopeSnapshot
  set(field: 'selection', value: string): Promise<void> | void
  subscribe(listener: () => void): () => void
}

export interface SelectionState {
  readonly preference: string
  readonly activeId: string
  readonly revision: number
  readonly persistence: 'idle' | 'saving' | 'error'
  readonly errorMessage?: string
  readonly managedByOtherPlugin: boolean
}

export interface SelectionController {
  restore(): void
  select(id: string): void
  sync(snapshot: ThemeSnapshot): void
  retry(): void
  subscribe(listener: () => void): () => void
  getSnapshot(): SelectionState
  dispose(): void
}

export interface SelectionOptions {
  readonly theme: Pick<ThemeService, 'getTheme' | 'setTheme'>
  readonly settings: SettingsScope
  readonly ownedIds: ReadonlySet<string>
  readonly builtInIds?: ReadonlySet<string>
}

const DEFAULT_BUILT_INS = new Set(['system', 'light', 'dark'])

export function createSelectionController(options: SelectionOptions): SelectionController {
  const builtInIds = options.builtInIds ?? DEFAULT_BUILT_INS
  const listeners = new Set<() => void>()
  let disposed = false
  let writeInFlight = false
  let queuedValue: string | undefined
  let latestValue = options.theme.getTheme().preference
  let state: SelectionState = {
    preference: latestValue,
    activeId: options.theme.getTheme().active.id,
    revision: 0,
    persistence: 'idle',
    managedByOtherPlugin: false,
  }

  const publish = (patch: Partial<SelectionState> & { readonly clearError?: boolean }): void => {
    if (disposed) return
    const next = { ...state, ...patch, revision: state.revision + 1 }
    delete next.clearError
    if (patch.clearError) delete next.errorMessage
    state = Object.freeze(next)
    for (const listener of listeners) listener()
  }

  const isOwned = (id: string): boolean => options.ownedIds.has(id) || builtInIds.has(id)

  const startWrite = (value: string): void => {
    if (disposed) return
    writeInFlight = true
    publish({ persistence: 'saving', clearError: true })
    let result: Promise<void>
    try {
      result = Promise.resolve(options.settings.set('selection', value))
    } catch (error) {
      result = Promise.reject(error)
    }
    void result.then(
      () => {
        if (disposed) return
        writeInFlight = false
        publish({ persistence: 'idle', clearError: true })
        if (queuedValue !== undefined) {
          const next = queuedValue
          queuedValue = undefined
          startWrite(next)
        }
      },
      error => {
        if (disposed) return
        writeInFlight = false
        const message = error instanceof Error ? error.message : String(error)
        publish({ persistence: 'error', errorMessage: message })
        queuedValue = undefined
      },
    )
  }

  const enqueueWrite = (value: string): void => {
    if (disposed) return
    if (writeInFlight) queuedValue = value
    else startWrite(value)
  }

  const unsubscribe = options.settings.subscribe(() => {
    // Settings pushes are durable acknowledgements; the session remains the
    // source of truth for the active theme and is not changed by this hook.
  })

  return {
    restore(): void {
      if (disposed) return
      const current = options.theme.getTheme().preference
      if (!isOwned(current)) {
        publish({ preference: current, activeId: options.theme.getTheme().active.id, managedByOtherPlugin: true })
        return
      }
      const durable = options.settings.getSnapshot().value.selection
      if (!isOwned(durable)) {
        options.theme.setTheme('system')
        latestValue = 'system'
        publish({ preference: 'system', activeId: options.theme.getTheme().active.id, managedByOtherPlugin: false })
        enqueueWrite('system')
        return
      }
      if (durable !== current) options.theme.setTheme(durable)
      latestValue = durable
      publish({ preference: durable, activeId: options.theme.getTheme().active.id, managedByOtherPlugin: false })
    },
    select(id: string): void {
      if (disposed || !isOwned(id)) return
      options.theme.setTheme(id)
      latestValue = id
      publish({ preference: id, activeId: options.theme.getTheme().active.id, managedByOtherPlugin: false })
      enqueueWrite(id)
    },
    sync(snapshot: ThemeSnapshot): void {
      if (disposed) return
      if (!isOwned(snapshot.preference)) {
        publish({ preference: snapshot.preference, activeId: snapshot.active.id, managedByOtherPlugin: true })
        return
      }
      latestValue = snapshot.preference
      publish({ preference: snapshot.preference, activeId: snapshot.active.id, managedByOtherPlugin: false })
      enqueueWrite(snapshot.preference)
    },
    retry(): void {
      if (disposed || state.persistence !== 'error') return
      enqueueWrite(latestValue)
    },
    subscribe(listener: () => void): () => void {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
    getSnapshot(): SelectionState {
      return state
    },
    dispose(): void {
      if (disposed) return
      disposed = true
      listeners.clear()
      unsubscribe()
    },
  }
}
