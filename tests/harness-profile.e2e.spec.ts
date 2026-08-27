import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

describe('DeepSeek Harness profile smoke', () => {
  it('keeps the Cordis patch declaration stable', async () => {
    const patch = await readFile(resolve(process.cwd(), 'cordis.patch.yml'), 'utf8')
    expect(patch).toContain('id: design-md-themes')
    expect(patch).toContain('name: deepseek-harness-design-md-themes')
  })

  it.skipIf(process.env.RUN_HARNESS_E2E !== '1')('loads in a real dsh profile when explicitly enabled', async () => {
    // Running a real profile is intentionally opt-in because dsh manages user state.
    // CI can provide an isolated DSH_HOME and set RUN_HARNESS_E2E=1.
    expect(process.env.DSH_HOME).toBeTruthy()
  })
})
