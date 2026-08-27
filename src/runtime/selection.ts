import type { ThemeService, ThemeSnapshot } from './contracts.ts'
import type { ThemePreferenceSettings } from './identity.ts'

export interface SettingsScopeSnapshot<T = ThemePreferenceSettings> {
  readonly status: 'loading' | 'ready' | 'unavailable'
  readonly value: T | undefined
  readonly base: unknown
  readonly user: unknown
  readonly revision: number | undefined
  readonly writable: boolean
  readonly mode: 'host' | 'memory'
}

export interface SettingsScope<T = ThemePreferenceSettings> {
  getSnapshot(): SettingsScopeSnapshot<T>
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
// Harness re-adopts its native ui-theme after settings writes; keep the custom
// intent alive long enough to reassert it through the public theme API.
const CUSTOM_REASSERT_WINDOW_MS = 1_000
// On cold start, let ui-layout's ThemePresenter finish its initial effect first.
const CUSTOM_RESTORE_REASSERT_DELAY_MS = 100

export function createSelectionController(options: SelectionOptions): SelectionController {
  const builtInIds = options.builtInIds ?? DEFAULT_BUILT_INS
  const listeners = new Set<() => void>()
  let disposed = false
  let writeInFlight = false
  let queuedValue: string | undefined
  let latestValue = options.theme.getTheme().preference
  let restored = false
  let pendingCustomSelection: string | undefined
  let applyingTheme = false
  let customReassertUntil = 0
  let customReassertScheduled = false
  let customRestoreReassertScheduled = false
  let customRestoreReassertTimer: ReturnType<typeof setTimeout> | undefined
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
  const isCustom = (id: string): boolean => options.ownedIds.has(id)

  const setTheme = (id: string): void => {
    applyingTheme = true
    try {
      options.theme.setTheme(id)
    } finally {
      applyingTheme = false
    }
  }

  const scheduleCustomReassert = (): void => {
    if (customReassertScheduled) return
    customReassertScheduled = true
    queueMicrotask(() => {
      customReassertScheduled = false
      if (disposed || pendingCustomSelection === undefined || customReassertUntil <= Date.now()) return
      setTheme(pendingCustomSelection)
    })
  }

  const scheduleCustomRestoreReassert = (): void => {
    if (customRestoreReassertScheduled) return
    customRestoreReassertScheduled = true
    customRestoreReassertTimer = setTimeout(() => {
      customRestoreReassertScheduled = false
      customRestoreReassertTimer = undefined
      if (disposed || pendingCustomSelection === undefined) return
      const desired = pendingCustomSelection
      if (options.theme.getTheme().preference !== desired) setTheme(desired)
    }, CUSTOM_RESTORE_REASSERT_DELAY_MS)
  }

  const startWrite = (value: string): void => {
    if (disposed) return
    if (isCustom(value)) customReassertUntil = Number.POSITIVE_INFINITY
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
        if (isCustom(value)) customReassertUntil = Date.now() + CUSTOM_REASSERT_WINDOW_MS
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
        if (isCustom(value)) customReassertUntil = 0
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

  const restore = (): void => {
    if (disposed || restored) return
    const current = options.theme.getTheme().preference
    if (!isOwned(current)) {
      pendingCustomSelection = undefined
      customReassertUntil = 0
      restored = true
      publish({ preference: current, activeId: options.theme.getTheme().active.id, managedByOtherPlugin: true })
      return
    }
    const durable = options.settings.getSnapshot().value?.selection
    if (durable === undefined) return
    restored = true
    if (!isOwned(durable)) {
      pendingCustomSelection = undefined
      customReassertUntil = 0
      setTheme('system')
      latestValue = 'system'
      publish({ preference: 'system', activeId: options.theme.getTheme().active.id, managedByOtherPlugin: false })
      enqueueWrite('system')
      return
    }
    pendingCustomSelection = isCustom(durable) ? durable : undefined
    if (!isCustom(durable)) customReassertUntil = 0
    if (durable !== current) setTheme(durable)
    latestValue = durable
    publish({ preference: durable, activeId: options.theme.getTheme().active.id, managedByOtherPlugin: false })
    if (isCustom(durable)) scheduleCustomRestoreReassert()
  }

  const unsubscribe = options.settings.subscribe(() => restore())

  return {
    restore(): void {
      restore()
    },
    select(id: string): void {
      if (disposed || !isOwned(id)) return
      pendingCustomSelection = isCustom(id) ? id : undefined
      if (!isCustom(id)) customReassertUntil = 0
      setTheme(id)
      latestValue = id
      publish({ preference: id, activeId: options.theme.getTheme().active.id, managedByOtherPlugin: false })
      enqueueWrite(id)
    },
    sync(snapshot: ThemeSnapshot): void {
      if (disposed) return
      if (!isOwned(snapshot.preference)) {
        pendingCustomSelection = undefined
        customReassertUntil = 0
        publish({ preference: snapshot.preference, activeId: snapshot.active.id, managedByOtherPlugin: true })
        return
      }
      if (isCustom(snapshot.preference)) {
        latestValue = snapshot.preference
        publish({ preference: snapshot.preference, activeId: snapshot.active.id, managedByOtherPlugin: false })
        if (!applyingTheme && pendingCustomSelection !== snapshot.preference) {
          pendingCustomSelection = snapshot.preference
          enqueueWrite(snapshot.preference)
        }
        return
      }
      if (!applyingTheme && pendingCustomSelection !== undefined && (writeInFlight || customReassertUntil > Date.now())) {
        scheduleCustomReassert()
        return
      }
      pendingCustomSelection = undefined
      customReassertUntil = 0
      latestValue = snapshot.preference
      publish({ preference: snapshot.preference, activeId: snapshot.active.id, managedByOtherPlugin: false })
      if (!applyingTheme) enqueueWrite(snapshot.preference)
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
      if (customRestoreReassertTimer !== undefined) clearTimeout(customRestoreReassertTimer)
      listeners.clear()
      unsubscribe()
    },
  }
}
