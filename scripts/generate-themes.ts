import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, join, resolve } from 'node:path'
import { generateCatalog } from '../src/themes/generate.ts'

function requiredArg(args: string[], name: string): string {
  const index = args.indexOf(name)
  const value = index >= 0 ? args[index + 1] : undefined
  if (value === undefined || value.startsWith('--')) throw new Error(`missing ${name}`)
  return value
}

const args = process.argv.slice(2)
const sourceRoot = resolve(requiredArg(args, '--source'))
const expectedCommit = requiredArg(args, '--commit')
const outputRoot = resolve(requiredArg(args, '--output'))
const files = await generateCatalog({ sourceRoot, expectedCommit, outputRoot, overrideRoot: join(outputRoot, 'theme-overrides') })
for (const file of files) {
  const target = join(outputRoot, file.path)
  await mkdir(dirname(target), { recursive: true })
  await writeFile(target, file.content, 'utf8')
}
console.log(`generated ${files.length} files (${files.filter(file => file.path.includes('/themes/')).length} themes)`)
