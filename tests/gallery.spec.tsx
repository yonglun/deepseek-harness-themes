import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { catalog } from '../src/themes/generated/catalog.ts'
import { categories } from '../src/themes/generated/categories.ts'
import { ThemeGallery } from '../src/gallery/ThemeGallery.tsx'
import { en } from '../src/gallery/locales.ts'
import type { SelectionState } from '../src/runtime/selection.ts'

function renderGallery(overrides: Partial<SelectionState> = {}) {
  let selection: SelectionState = { preference: 'system', activeId: 'system', revision: 0, persistence: 'idle', managedByOtherPlugin: false, ...overrides }
  const select = vi.fn((id: string) => { selection = { ...selection, preference: id, activeId: id, revision: selection.revision + 1 } })
  const retry = vi.fn()
  const listeners = new Set<() => void>()
  const controller = {
    restore: vi.fn(), select, sync: vi.fn(), retry, subscribe: (listener: () => void) => { listeners.add(listener); return () => listeners.delete(listener) }, getSnapshot: () => selection, dispose: vi.fn(),
  }
  const view = render(<ThemeGallery catalog={catalog} categories={categories} controller={controller} locale={en} />)
  return { ...view, select, retry, rerenderSelection(next: Partial<SelectionState>) { selection = { ...selection, ...next }; view.rerender(<ThemeGallery catalog={catalog} categories={categories} controller={controller} locale={en} />) } }
}

describe('ThemeGallery', () => {
  it('renders 74 source cards plus Light, Dark and System in one radiogroup', () => {
    renderGallery()
    expect(screen.getAllByRole('radiogroup')).toHaveLength(1)
    expect(screen.getAllByRole('radio')).toHaveLength(77)
  })

  it('filters cards by search, category and scheme', () => {
    renderGallery()
    fireEvent.change(screen.getByRole('searchbox', { name: 'Search themes' }), { target: { value: 'Claude' } })
    expect(screen.getAllByRole('radio').map(node => node.textContent)).toContainEqual(expect.stringContaining('Claude'))
    expect(screen.queryByText('VoltAgent')).toBeNull()
    fireEvent.change(screen.getByLabelText('Color scheme'), { target: { value: 'dark' } })
    expect(screen.getByText('No themes match these filters.')).toBeTruthy()
  })

  it('marks exactly the current card checked', () => {
    renderGallery({ preference: 'design-md-claude' })
    const checked = screen.getAllByRole('radio').filter(node => node.getAttribute('aria-checked') === 'true')
    expect(checked).toHaveLength(1)
    expect(checked[0]!.textContent).toContain('Claude')
  })

  it('moves focus with ArrowRight and selects with Space', () => {
    const { select } = renderGallery()
    const cards = screen.getAllByRole('radio')
    ;(cards[0] as HTMLElement).focus()
    fireEvent.keyDown(cards[0]!, { key: 'ArrowRight' })
    expect(document.activeElement).toBe(cards[1])
    fireEvent.keyDown(cards[1]!, { key: ' ' })
    expect(select).toHaveBeenCalledWith(cards[1]!.getAttribute('data-theme-id'))
  })

  it('shows retry and external-provider states', () => {
    const { retry, rerenderSelection } = renderGallery({ persistence: 'error', errorMessage: 'write failed' })
    fireEvent.click(screen.getByRole('button', { name: 'Retry saving' }))
    expect(retry).toHaveBeenCalledOnce()
    rerenderSelection({ managedByOtherPlugin: true, preference: 'other-plugin-theme' })
    expect(screen.getByText('Another plugin currently manages the active theme.')).toBeTruthy()
  })
})
