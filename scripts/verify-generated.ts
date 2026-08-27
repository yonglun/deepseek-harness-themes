import { readFile } from 'node:fs/promises'
import { resolve, join } from 'node:path'
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
const differing: string[] = []
for (const file of files) {
  try {
    if ((await readFile(join(outputRoot, file.path), 'utf8')) !== file.content) differing.push(file.path)
  } catch {
    differing.push(file.path)
  }
}
if (differing.length > 0) {
  console.error(differing.join('\n'))
  process.exitCode = 1
} else {
  console.log(`verified ${files.length} generated files`)
}
