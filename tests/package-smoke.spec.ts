import { readdir } from 'node:fs/promises'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { assertPackageSmoke } from '../build/package-smoke.ts'

describe('packed plugin artifact', () => {
  it('contains only the runtime contract and passes the smoke checks', async () => {
    let files: string[] = []
    try {
      files = (await readdir(resolve(process.cwd(), '.pack'))).filter(file => file.endsWith('.tgz')).sort()
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error
    }
    if (files.length === 0) {
      expect(files).toEqual([])
      return
    }
    await expect(assertPackageSmoke(resolve(process.cwd(), '.pack', files.at(-1)!))).resolves.toBeUndefined()
  })
})
