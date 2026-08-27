import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { discoverSource } from '../src/themes/source.ts'

const fixtureRoot = resolve(process.cwd(), 'tests/fixtures/awesome-design-md')

describe('discoverSource', () => {
  it('requires every design slug to have exactly one category', async () => {
    const source = await discoverSource({
      root: fixtureRoot,
      expectedCommit: 'fixture-commit',
      categoryOverrides: { slack: 'productivity-saas' },
      readCommit: async () => 'fixture-commit',
    })
    expect(source.designs.map(item => item.slug)).toEqual(['claude', 'voltagent'])
    expect(source.categories.get('claude')).toBe('ai-llm')
    expect(source.categories.get('voltagent')).toBe('developer-tools')
  })

  it('fails closed on a wrong pinned commit', async () => {
    await expect(
      discoverSource({
        root: fixtureRoot,
        expectedCommit: 'wrong-commit',
        readCommit: async () => 'fixture-commit',
      }),
    ).rejects.toThrow(/expected commit wrong-commit but found fixture-commit/)
  })
})
