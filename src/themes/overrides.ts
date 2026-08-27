import { readFile } from 'node:fs/promises'
import { load } from 'js-yaml'
import type { CanonicalPalette } from './contracts.ts'

export interface ThemeOverride {
  readonly reason: string
  readonly colorScheme?: 'light' | 'dark'
  readonly roles?: Readonly<Partial<Record<keyof CanonicalPalette, string>>>
  readonly sourceRoles?: Readonly<Partial<Record<keyof CanonicalPalette, string>>>
  readonly fontKind?: 'sans' | 'serif' | 'mono'
  readonly shadow?: 'none' | 'soft' | 'strong'
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

export function parseThemeOverride(value: unknown, sourcePath = 'override'): ThemeOverride {
  if (!isRecord(value) || typeof value.reason !== 'string' || value.reason.trim().length === 0) {
    throw new Error(`${sourcePath}: reason must be a non-empty string`)
  }
  const allowedSchemes = new Set(['light', 'dark'])
  const allowedFonts = new Set(['sans', 'serif', 'mono'])
  const allowedShadows = new Set(['none', 'soft', 'strong'])
  if (value.colorScheme !== undefined && (typeof value.colorScheme !== 'string' || !allowedSchemes.has(value.colorScheme))) {
    throw new Error(`${sourcePath}: invalid colorScheme`)
  }
  if (value.fontKind !== undefined && (typeof value.fontKind !== 'string' || !allowedFonts.has(value.fontKind))) throw new Error(`${sourcePath}: invalid fontKind`)
  if (value.shadow !== undefined && (typeof value.shadow !== 'string' || !allowedShadows.has(value.shadow))) throw new Error(`${sourcePath}: invalid shadow`)
  const checkRoles = (key: 'roles' | 'sourceRoles'): Record<string, string> | undefined => {
    const raw = value[key]
    if (raw === undefined) return undefined
    if (!isRecord(raw)) throw new Error(`${sourcePath}: ${key} must be a mapping`)
    const result: Record<string, string> = {}
    for (const [role, color] of Object.entries(raw)) {
      if (typeof color !== 'string' || color.trim().length === 0) throw new Error(`${sourcePath}: ${key}.${role} must be a string`)
      result[role] = color
    }
    return Object.freeze(result)
  }
  const roles = checkRoles('roles')
  const sourceRoles = checkRoles('sourceRoles')
  return Object.freeze({
    reason: value.reason,
    ...(value.colorScheme === undefined ? {} : { colorScheme: value.colorScheme as 'light' | 'dark' }),
    ...(value.fontKind === undefined ? {} : { fontKind: value.fontKind as 'sans' | 'serif' | 'mono' }),
    ...(value.shadow === undefined ? {} : { shadow: value.shadow as 'none' | 'soft' | 'strong' }),
    ...(roles === undefined ? {} : { roles }),
    ...(sourceRoles === undefined ? {} : { sourceRoles }),
  })
}

export async function loadThemeOverride(path: string): Promise<ThemeOverride> {
  const value = load(await readFile(path, 'utf8'))
  return parseThemeOverride(value, path)
}
