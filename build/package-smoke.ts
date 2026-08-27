import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { basename, resolve } from 'node:path'

const execFileAsync = promisify(execFile)

export const REQUIRED_PACKAGE_FILES = Object.freeze([
  'package/README.md',
  'package/README.zh.md',
  'package/LICENSE',
  'package/THIRD_PARTY_NOTICES.md',
  'package/cordis.patch.yml',
  'package/lib/index.js',
  'package/lib/index.d.ts',
  'package/lib/client.js',
  'package/lib/client.d.ts',
])

export async function listTarballFiles(tarballPath: string): Promise<readonly string[]> {
  const { stdout } = await execFileAsync('tar', ['-tzf', tarballPath])
  return stdout.split(/\r?\n/).map(line => line.trim()).filter(Boolean).sort()
}

function assertSafeArchivePath(path: string): void {
  if (path.startsWith('/') || path.split('/').some(segment => segment === '..')) throw new Error(`unsafe package path: ${path}`)
}

export async function assertPackageSmoke(tarballPath: string): Promise<void> {
  const files = await listTarballFiles(tarballPath)
  for (const file of files) assertSafeArchivePath(file)
  const fileSet = new Set(files)
  for (const required of REQUIRED_PACKAGE_FILES) if (!fileSet.has(required)) throw new Error(`package is missing ${required}`)
  if ([...fileSet].some(file => /(?:^|\/)(?:src|tests|tmp|node_modules)(?:\/|$)/.test(file))) throw new Error('package contains development-only source files')

  const packageJson = JSON.parse(await (async () => {
    const { stdout } = await execFileAsync('tar', ['-xOf', tarballPath, 'package/package.json'])
    return stdout
  })()) as Record<string, unknown>
  if (packageJson.name !== 'deepseek-harness-design-md-themes') throw new Error('package name changed')
  const dsh = packageJson.dsh as { client?: Record<string, unknown>; bundle?: Record<string, unknown> } | undefined
  if (JSON.stringify(dsh) !== JSON.stringify({
    client: {
      inject: [
        '@deepseek-ai/dsh-client-ui-theme',
        '@deepseek-ai/dsh-client-runtime',
        '@deepseek-ai/dsh-client-ui-slots',
        '@deepseek-ai/dsh-client-locale',
      ],
      platform: 'web',
      immediately: true,
    },
    bundle: { patch: './cordis.patch.yml' },
  })) throw new Error('dsh manifest is not the documented plugin contract')

  const client = await (async () => {
    const { stdout } = await execFileAsync('tar', ['-xOf', tarballPath, 'package/lib/client.js'])
    return stdout
  })()
  if (!client.includes('window.__ModuleLoader__.load')) throw new Error('client bundle is not a Harness module-loader artifact')
  if (/from\s+["'](?:\.|\/)/.test(client) || /import\s*\(/.test(client)) throw new Error('client bundle contains a source-relative or dynamic source import')
  if (/document\.querySelector\(/.test(client)) throw new Error('client bundle reaches outside its owned DOM mount')

  const patch = await (async () => {
    const { stdout } = await execFileAsync('tar', ['-xOf', tarballPath, 'package/cordis.patch.yml'])
    return stdout
  })()
  if (!patch.includes('id: design-md-themes') || !patch.includes('name: deepseek-harness-design-md-themes')) throw new Error('Cordis patch does not declare the plugin')
  const peerDependencies = packageJson.peerDependencies as Record<string, string> | undefined
  if (peerDependencies?.['@deepseek-ai/dsh-client-ui-theme'] !== '0.1.1-rc.2') throw new Error('unexpected Harness peer baseline')
}

async function main(): Promise<void> {
  const input = process.argv[2]
  const tarball = input ? resolve(input) : resolve('.pack', 'deepseek-harness-design-md-themes-0.1.0.tgz')
  await assertPackageSmoke(tarball)
  console.log(`package smoke passed: ${basename(tarball)}`)
}

if (process.argv[1]?.endsWith('package-smoke.ts')) await main()
