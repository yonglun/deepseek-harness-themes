import { catalog } from './themes/generated/catalog.ts'
import { categories } from './themes/generated/categories.ts'
import { THEMES_NAMESPACE } from './runtime/identity.ts'
import { registerCatalog } from './runtime/register.ts'
import { createSelectionController, type SelectionController, type SettingsScope } from './runtime/selection.ts'
import { createGalleryStore } from './gallery/store.ts'
import { ThemeGallery, disposeGalleryStyles } from './gallery/ThemeGallery.tsx'
import { en, zh } from './gallery/locales.ts'

export const inject = ['theme', 'settingsScope', 'slots', 'locale'] as const

interface LocaleService {
  register(namespace: string, dictionaries: { en: unknown; zh: unknown }): () => void
  bind(namespace: string): (key: string, params?: Record<string, unknown>) => string
}

interface SlotsService {
  inject(name: string, factory: () => unknown): unknown
  register(options: { name: string; id: string; order: number; label: () => string; inject: () => unknown }, component: typeof ThemeGallery): () => void
}

interface ClientContext {
  readonly theme: Parameters<typeof registerCatalog>[0] & { setTheme(id: string): void; getTheme(): ReturnType<Parameters<typeof createSelectionController>[0]['theme']['getTheme']> }
  readonly settingsScope: { bind(options: { namespace: string }): SettingsScope }
  readonly slots: SlotsService
  readonly locale: LocaleService
  effect(setup: () => void | (() => void), name?: string): unknown
  on(event: 'theme/change', listener: (snapshot: ReturnType<ClientContext['theme']['getTheme']>) => void): () => void
}

export function apply(ctx: ClientContext): void {
  if (catalog.length !== 74) throw new Error(`expected 74 generated themes, found ${catalog.length}`)
  ctx.effect(() => registerCatalog(ctx.theme, catalog), 'design-md-themes: register catalog')
  const scope = ctx.settingsScope.bind({ namespace: THEMES_NAMESPACE })
  const controller = createSelectionController({
    theme: ctx.theme,
    settings: scope,
    ownedIds: new Set(catalog.map(entry => entry.id)),
  })
  const store = createGalleryStore(controller.getSnapshot())
  ctx.effect(() => controller.subscribe(() => store.syncSelection(controller.getSnapshot())), 'design-md-themes: selection sync')
  ctx.effect(() => () => controller.dispose(), 'design-md-themes: controller')
  ctx.effect(() => ctx.locale.register('settings.design-md-themes', { en, zh }), 'design-md-themes: locale')
  const t = ctx.locale.bind('settings.design-md-themes')
  ctx.effect(() => ctx.on('theme/change', snapshot => controller.sync(snapshot)), 'design-md-themes: theme listener')
  ctx.effect(() => () => disposeGalleryStyles(), 'design-md-themes: gallery styles')
  ctx.effect(() => {
    const contribution = ctx.slots.inject('settings.section', () => ctx.slots.register({
        name: 'settings.section',
        id: 'design-md-themes',
        order: 45,
        label: () => t('title'),
        inject: () => ({ catalog, categories, controller, store }),
      }, ThemeGallery))
    return typeof contribution === 'function' ? contribution as () => void : undefined
  }, 'design-md-themes: settings section')
  ctx.effect(() => {
    // Restore on the next host turn so ui-layout's ThemePresenter is subscribed first.
    const timer = setTimeout(() => controller.restore(), 0)
    return () => clearTimeout(timer)
  }, 'design-md-themes: restore')
}

export type { ClientContext, SelectionController }
