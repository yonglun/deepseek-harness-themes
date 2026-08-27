import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

describe('client bundle dependency boundary', () => {
  it('keeps host-only settings schema dependencies out of the client entry', async () => {
    const source = await readFile(resolve(process.cwd(), 'src/client.ts'), 'utf8')
    expect(source).not.toContain("from './host/settings.ts'")
    expect(source).toContain("from './runtime/identity.ts'")
  })
})
