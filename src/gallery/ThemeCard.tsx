import type { CSSProperties, KeyboardEvent } from 'react'
import type { ThemeCatalogEntry } from '../themes/contracts.ts'
import styles from './ThemeGallery.module.css'

export interface ThemeCardProps {
  readonly entry: ThemeCatalogEntry
  readonly checked: boolean
  readonly tabIndex: 0 | -1
  onSelect(id: string): void
  onMove(id: string, direction: -1 | 1): void
}

export function ThemeCard({ entry, checked, tabIndex, onSelect, onMove }: ThemeCardProps) {
  const onKeyDown = (event: KeyboardEvent<HTMLButtonElement>): void => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      onSelect(entry.id)
    } else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
      event.preventDefault()
      onMove(entry.id, -1)
    } else if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
      event.preventDefault()
      onMove(entry.id, 1)
    }
  }
  const previewStyle = {
    '--preview-base': entry.preview.base,
    '--preview-layer': entry.preview.layer,
    '--preview-sidebar': entry.preview.sidebar,
    '--preview-text': entry.preview.text,
    '--preview-accent': entry.preview.accent,
  } as CSSProperties
  return (
    <button
      type="button"
      role="radio"
      aria-checked={checked}
      aria-label={entry.name}
      data-theme-id={entry.id}
      tabIndex={tabIndex}
      className={styles.card}
      onClick={() => onSelect(entry.id)}
      onKeyDown={onKeyDown}
    >
      <span className={styles.preview} style={previewStyle} aria-hidden="true">
        <span className={styles.previewSidebar} />
        <span className={styles.previewContent}>
          <span className={styles.previewLine} />
          <span className={styles.previewLineShort} />
          <span className={styles.previewButton} />
        </span>
      </span>
      <span className={styles.cardMeta}>
        <span className={styles.cardName}>{entry.name}</span>
        <span className={styles.cardCategory}>{entry.category} · {entry.colorScheme}</span>
      </span>
      {checked ? <span className={styles.selectedMark}>{'✓'}</span> : null}
    </button>
  )
}
