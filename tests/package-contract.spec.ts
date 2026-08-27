import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const pkg = JSON.parse(readFileSync(resolve(process.cwd(), 'package.json'), 'utf8'))

describe('package contract', () => {
  it('is one installable dsh host/client bundle', () => {
    expect(pkg.name).toBe('deepseek-harness-design-md-themes')
    expect(pkg.type).toBe('module')
    expect(pkg.dsh.bundle.patch).toBe('./cordis.patch.yml')
    expect(pkg.dsh.client).toEqual({
      inject: [
        '@deepseek-ai/dsh-client-ui-theme',
        '@deepseek-ai/dsh-client-runtime',
        '@deepseek-ai/dsh-client-ui-slots',
        '@deepseek-ai/dsh-client-locale',
      ],
      platform: 'web',
      immediately: true,
    })
    expect(pkg.files).toEqual([
      'lib',
      'cordis.patch.yml',
      'README.md',
      'README.zh.md',
      'docs/*.md',
      'docs/assets/readme/**/*',
      'LICENSE',
      'THIRD_PARTY_NOTICES.md',
      'THIRD_PARTY_NOTICES.zh-CN.md',
    ])
    expect(pkg.scripts['readme:assets']).toBe('node --import tsx scripts/generate-readme-assets.ts')
  })
})
