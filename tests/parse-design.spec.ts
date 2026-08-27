import { mkdir, mkdtemp, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { parseDesign } from '../src/themes/parse-design.ts'

const fixtureRoot = resolve(process.cwd(), 'tests/fixtures/awesome-design-md')

describe('parseDesign', () => {
  it('parses YAML front matter without reading the markdown body as YAML', async () => {
    const parsed = await parseDesign({
      root: fixtureRoot,
      relativePath: 'design-md/claude/DESIGN.md',
      category: 'ai-llm',
    })
    expect(parsed).toMatchObject({
      slug: 'claude',
      name: 'Claude-design-analysis',
      category: 'ai-llm',
      colors: { primary: '#cc785c', canvas: '#faf9f5' },
    })
    expect(parsed.sha256).toMatch(/^[a-f0-9]{64}$/)
    expect(parsed.sourcePath).toBe('design-md/claude/DESIGN.md')
  })

  it('rejects malformed front matter and non-string colors with source-prefixed errors', async () => {
    const root = await mkdtemp(join(tmpdir(), 'dsh-theme-parse-'))
    await mkdir(join(root, 'design-md/bad'), { recursive: true })
    const relativePath = 'design-md/bad/DESIGN.md'
    await writeFile(join(root, relativePath), '---\nname: Bad\n---\nbody\n')
    await expect(parseDesign({ root, relativePath, category: 'test' })).rejects.toThrow(
      `${relativePath}: missing required colors record`,
    )
    await writeFile(
      join(root, relativePath),
      '---\nname: Bad\ndescription: Bad\ncolors:\n  primary: 42\ntypography: {}\n---\n',
    )
    await expect(parseDesign({ root, relativePath, category: 'test' })).rejects.toThrow(
      `${relativePath}: colors.primary must be a string`,
    )
  })
})
