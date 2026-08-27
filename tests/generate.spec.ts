import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { generateCatalog } from '../src/themes/generate.ts'

const fixtureRoot = resolve(process.cwd(), 'tests/fixtures/awesome-design-md')
const fixtureOptions = {
  sourceRoot: fixtureRoot,
  expectedCommit: 'fixture-commit',
  readCommit: async () => 'fixture-commit',
}

describe('generateCatalog', () => {
  it('sorts themes by slug and produces byte-identical files twice', async () => {
    const first = await generateCatalog(fixtureOptions)
    const second = await generateCatalog(fixtureOptions)
    expect(second).toEqual(first)
    expect(first.map(file => file.path)).toEqual([...first.map(file => file.path)].sort())
  })

  it('writes provenance with SHA-256 source hashes', async () => {
    const files = await generateCatalog(fixtureOptions)
    const manifest = JSON.parse(files.find(file => file.path.endsWith('source-manifest.json'))!.content)
    expect(manifest).toMatchObject({ sourceCommit: 'fixture-commit', themeCount: 2 })
    expect(manifest.sources[0].sha256).toMatch(/^[a-f0-9]{64}$/)
  })
})
