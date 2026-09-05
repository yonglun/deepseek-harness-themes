import { readFileSync } from 'node:fs'
import { catalog } from '../src/themes/generated/catalog.ts'
import { renderPage, installCommand } from '../scripts/site/page.ts'
import en from '../scripts/site/content.en.ts'
import zh from '../scripts/site/content.zh.ts'
// Browser modules deliberately remain directly deployable JavaScript.
import { filterThemes, validateThemes } from '../site/assets/theme-utils.js'

describe('landing page', () => {
  it('ships exactly the runtime catalog palettes without full runtime tokens', () => {
    const data = JSON.parse(readFileSync('site/assets/themes.json', 'utf8'))
    expect(validateThemes(data)).toHaveLength(74)
    expect(data).toEqual(catalog.map(({ id, slug, name, category, colorScheme, preview }) => ({ id, slug, name, category, colorScheme, preview })))
  })

  it('combines case-insensitive search, color scheme and category filters', () => {
    expect(filterThemes(catalog, { query: ' CLAUDE ', scheme: 'light', category: 'ai-llm' }).map(t => t.slug)).toEqual(['claude'])
    expect(filterThemes(catalog, { query: 'claude', scheme: 'dark' })).toEqual([])
    expect(filterThemes(catalog, { query: 'claude', category: 'automotive' })).toEqual([])
    expect(filterThemes(catalog)).toHaveLength(74)
  })

  it('rejects malformed palettes and duplicate identifiers', () => {
    const data = JSON.parse(readFileSync('site/assets/themes.json', 'utf8'))
    data[0].preview.base = 'url(https://example.com)'
    expect(() => validateThemes(data)).toThrow('Invalid theme data')
    data[0] = data[1]
    expect(() => validateThemes(data)).toThrow('Invalid theme data')
  })

  it.each([[en, './', 'index.html'], [zh, '../', 'zh/index.html']] as const)('renders complete static pages with synchronized install instructions (%s)', (content, prefix, filename) => {
    const html = renderPage(content, prefix)
    expect(readFileSync(`site/${filename}`, 'utf8')).toBe(html)
    document.documentElement.innerHTML = html
    expect(document.querySelectorAll('h1')).toHaveLength(1)
    expect(document.querySelector('#install-command')?.textContent).toBe(installCommand)
    expect(document.querySelector('.language')?.getAttribute('href')).toBe(content.languageHref)
    expect(document.querySelector('script[type="module"]')?.getAttribute('src')).toBe(`${prefix}assets/app.js`)
    expect(document.querySelectorAll('details')).toHaveLength(4)
    expect(readFileSync('README.md', 'utf8')).toContain(installCommand)
  })
})
