import { mkdir, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { catalog } from '../src/themes/generated/catalog.ts'
import { generateReadmeAssets } from './readme-assets.ts'

const assets = generateReadmeAssets(catalog)

for (const asset of assets) {
  const target = resolve(process.cwd(), asset.path)
  await mkdir(dirname(target), { recursive: true })
  await writeFile(target, asset.content, 'utf8')
}

console.log(`generated ${assets.length} README visual assets`)
