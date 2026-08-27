import { access, readFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const documents = ['README.md', 'README.zh.md'] as const
const requiredAssets = [
  'docs/assets/readme/hero.png',
  'docs/assets/readme/theme-atlas.svg',
  'docs/assets/readme/spotlight/claude.svg',
  'docs/assets/readme/spotlight/binance.svg',
  'docs/assets/readme/spotlight/linear.app.svg',
  'docs/assets/readme/spotlight/airbnb.svg',
  'docs/assets/readme/spotlight/spotify.svg',
  'docs/assets/readme/spotlight/posthog.svg',
  'docs/assets/readme/spotlight/ferrari.svg',
  'docs/assets/readme/spotlight/nintendo-2001.svg',
]

describe('README showcase', () => {
  it.each(documents)('%s has the approved content hierarchy and local images', async file => {
    const markdown = await readFile(resolve(file), 'utf8')
    for (const asset of requiredAssets) expect(markdown).toContain(asset)
    const hero = markdown.indexOf('docs/assets/readme/hero.png')
    const install = markdown.indexOf('dsh plugin --profile web add deepseek-harness-design-md-themes')
    const spotlight = markdown.indexOf('docs/assets/readme/spotlight/claude.svg')
    const atlas = markdown.indexOf('docs/assets/readme/theme-atlas.svg')
    expect(hero).toBeGreaterThan(-1)
    expect(install).toBeGreaterThan(hero)
    expect(spotlight).toBeGreaterThan(install)
    expect(atlas).toBeGreaterThan(spotlight)
  })

  it('keeps every relative README link resolvable', async () => {
    for (const file of documents) {
      const markdown = await readFile(resolve(file), 'utf8')
      for (const match of markdown.matchAll(/(?:!?)\[[^\]]*\]\(([^)]+)\)|<img[^>]+src="([^"]+)"/g)) {
        const target = match[1] ?? match[2]
        const path = target?.split('#')[0]
        if (!path || /^(?:https?:|mailto:|#)/.test(path)) continue
        await expect(access(resolve(dirname(file), path))).resolves.toBeUndefined()
      }
    }
  })
})
