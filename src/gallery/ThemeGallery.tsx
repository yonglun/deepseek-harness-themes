import { useEffect, useMemo, useRef, useSyncExternalStore } from 'react'
import type { ThemeCatalogEntry } from '../themes/contracts.ts'
import type { SelectionController } from '../runtime/selection.ts'
import { createGalleryStore, type GalleryStore } from './store.ts'
import { filterCatalog } from './filter.ts'
import { en, type GalleryLocale } from './locales.ts'
import { ThemeCard } from './ThemeCard.tsx'
import styles, * as cssModule from './ThemeGallery.module.css?dsh'

export function disposeGalleryStyles(): void {
  const disposer = (cssModule as { readonly disposeCss?: () => void }).disposeCss
  if (disposer !== undefined) disposer()
  else if (typeof document !== 'undefined') document.head.querySelector('style[data-plugin-css="deepseek-harness-design-md-themes/ThemeGallery.module.css"]')?.remove()
}

export interface ThemeGalleryProps {
  readonly catalog: readonly ThemeCatalogEntry[]
  readonly categories: readonly string[]
  readonly controller: SelectionController
  readonly locale?: GalleryLocale
  readonly store?: GalleryStore
  readonly close?: () => void
}

const BUILTIN_IDS = ['light', 'dark', 'system'] as const

function builtInEntry(id: typeof BUILTIN_IDS[number], locale: GalleryLocale, catalog: readonly ThemeCatalogEntry[]): ThemeCatalogEntry {
  const source = catalog[0]
  const preview = source?.preview ?? { base: 'var(--dsw-alias-bg-base)', layer: 'var(--dsw-alias-bg-layer-1)', sidebar: 'var(--dsw-specific-sidebar-fill)', text: 'var(--dsw-alias-label-primary)', accent: 'var(--dsw-alias-brand-primary)' }
  const labels = { light: locale.builtInLight, dark: locale.builtInDark, system: locale.builtInSystem }
  return {
    id,
    slug: id,
    name: labels[id],
    description: labels[id],
    category: 'built-in',
    colorScheme: id === 'dark' ? 'dark' : 'light',
    preview,
    theme: { id, colorScheme: id === 'dark' ? 'dark' : 'light', tokens: {} },
  }
}

export function ThemeGallery({ catalog, categories, controller, locale = en, store: providedStore, close: _close }: ThemeGalleryProps) {
  const store = useMemo(() => providedStore ?? createGalleryStore(controller.getSnapshot()), [controller, providedStore])
  const selection = useSyncExternalStore(controller.subscribe, controller.getSnapshot, controller.getSnapshot)
  const gallery = useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot)
  const refs = useRef(new Map<string, HTMLButtonElement>())
  useEffect(() => store.syncSelection(selection), [selection, store])
  const builtIns = useMemo(() => BUILTIN_IDS.map(id => builtInEntry(id, locale, catalog)), [catalog, locale])
  const builtInFiltered = builtIns.filter(entry => {
    const query = gallery.query.trim().toLocaleLowerCase()
    return (gallery.scheme === 'all' || entry.colorScheme === gallery.scheme)
      && (gallery.category === 'all' || gallery.category === 'built-in')
      && (query.length === 0 || [entry.name, entry.slug, entry.description].some(value => value.toLocaleLowerCase().includes(query)))
  })
  const sourceFiltered = filterCatalog(catalog, gallery)
  const entries = [...builtInFiltered, ...sourceFiltered]
  const focusMove = (id: string, direction: -1 | 1): void => {
    const index = entries.findIndex(entry => entry.id === id)
    const target = entries[index + direction]
    if (target !== undefined) refs.current.get(target.id)?.focus()
  }
  const checkedId = selection.preference
  return (
    <section className={styles.root} aria-labelledby="design-md-theme-title">
      <div className={styles.header}>
        <div>
          <h2 id="design-md-theme-title" className={styles.title}>{locale.title}</h2>
          <p className={styles.subtitle}>74 source analyses · {catalog.length} generated themes</p>
        </div>
      </div>
      <div className={styles.toolbar}>
        <label className={styles.field}>
          <span>{locale.searchLabel}</span>
          <input type="search" aria-label={locale.searchLabel} placeholder={locale.searchPlaceholder} value={gallery.query} onChange={event => store.setQuery(event.target.value)} />
        </label>
        <label className={styles.field}>
          <span>{locale.schemeLabel}</span>
          <select aria-label={locale.schemeLabel} value={gallery.scheme} onChange={event => store.setScheme(event.target.value as 'all' | 'light' | 'dark')}>
            <option value="all">{locale.allSchemes}</option>
            <option value="light">{locale.lightScheme}</option>
            <option value="dark">{locale.darkScheme}</option>
          </select>
        </label>
        <label className={styles.field}>
          <span>{locale.categoryLabel}</span>
          <select aria-label={locale.categoryLabel} value={gallery.category} onChange={event => store.setCategory(event.target.value)}>
            <option value="all">{locale.allCategories}</option>
            {categories.map(category => <option key={category} value={category}>{category}</option>)}
          </select>
        </label>
      </div>
      {selection.managedByOtherPlugin ? <p role="status" className={styles.notice}>{locale.externalProvider}</p> : null}
      {selection.persistence === 'error' ? <div role="alert" className={styles.error}>{locale.persistenceError} <button type="button" onClick={() => controller.retry()}>{locale.retrySaving}</button></div> : null}
      {entries.length === 0 ? <p role="status" className={styles.empty}>{locale.empty}</p> : (
        <div role="radiogroup" aria-label={locale.title} className={styles.grid}>
          {entries.map((entry, index) => (
            <span key={entry.id} ref={node => { const button = node?.querySelector('button') as HTMLButtonElement | null; if (button !== null) refs.current.set(entry.id, button); }}>
              <ThemeCard
                entry={entry}
                checked={checkedId === entry.id}
                tabIndex={index === 0 ? 0 : -1}
                onSelect={id => controller.select(id)}
                onMove={focusMove}
              />
            </span>
          ))}
        </div>
      )}
    </section>
  )
}
