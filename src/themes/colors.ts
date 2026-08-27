import { clampGamut, converter, formatHex, parse } from 'culori'

interface RgbColor {
  readonly mode: 'rgb'
  readonly r: number
  readonly g: number
  readonly b: number
  readonly alpha?: number
  readonly [key: string]: unknown
}

interface OklchColor {
  readonly mode: 'oklch'
  readonly l: number
  readonly c: number
  readonly h?: number
  readonly [key: string]: unknown
}

export class ContrastCorrectionError extends Error {
  readonly foreground: string
  readonly backgrounds: readonly string[]
  readonly ratios: readonly number[]

  constructor(foreground: string, backgrounds: readonly string[], ratios: readonly number[]) {
    super(`contrast correction failed for ${foreground}: ${ratios.map(ratio => ratio.toFixed(3)).join(', ')}`)
    this.name = 'ContrastCorrectionError'
    this.foreground = foreground
    this.backgrounds = backgrounds
    this.ratios = ratios
  }
}

function toRgb(value: string): RgbColor {
  const parsed = parse(value)
  if (parsed === undefined) throw new Error(`invalid color: ${value}`)
  const rgb = converter('rgb')(parsed)
  if (rgb.r === undefined || rgb.g === undefined || rgb.b === undefined) throw new Error(`invalid color: ${value}`)
  return {
    mode: 'rgb',
    r: rgb.r,
    g: rgb.g,
    b: rgb.b,
    ...(rgb.alpha === undefined ? {} : { alpha: rgb.alpha }),
  }
}

function composite(foreground: RgbColor, background: RgbColor): RgbColor {
  const alpha = foreground.alpha ?? 1
  if (alpha >= 1) return foreground
  return {
    mode: 'rgb',
    r: foreground.r * alpha + background.r * (1 - alpha),
    g: foreground.g * alpha + background.g * (1 - alpha),
    b: foreground.b * alpha + background.b * (1 - alpha),
  }
}

function luminance(color: RgbColor): number {
  const linear = (channel: number): number => {
    const value = Math.max(0, Math.min(1, channel))
    return value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4
  }
  return linear(color.r) * 0.2126 + linear(color.g) * 0.7152 + linear(color.b) * 0.0722
}

export function contrastRatio(foreground: string, background: string): number {
  const bg = toRgb(background)
  const fg = composite(toRgb(foreground), bg)
  const first = luminance(fg)
  const second = luminance(bg)
  return (Math.max(first, second) + 0.05) / (Math.min(first, second) + 0.05)
}

function toHex(value: OklchColor): string {
  const clamped = clampGamut('rgb')(value)
  return formatHex(converter('rgb')(clamped)).toLowerCase().slice(0, 7)
}

export function mixColors(first: string, second: string, weight: number): string {
  const a = converter('oklch')(toRgb(first)) as OklchColor
  const b = converter('oklch')(toRgb(second)) as OklchColor
  const t = Math.max(0, Math.min(1, weight))
  const hue = a.h === undefined ? b.h : b.h === undefined ? a.h : a.h + (b.h - a.h) * t
  return toHex({
    mode: 'oklch',
    l: a.l + (b.l - a.l) * t,
    c: a.c + (b.c - a.c) * t,
    ...(hue === undefined ? {} : { h: hue }),
  })
}

function candidateAt(base: OklchColor, lightness: number): string {
  return toHex({ ...base, l: Math.max(0, Math.min(1, lightness)) })
}

export function correctForeground(
  foreground: string,
  backgrounds: readonly string[],
  minimum: number,
): string {
  if (backgrounds.length === 0) return toHex(converter('oklch')(toRgb(foreground)) as OklchColor)
  const base = converter('oklch')(toRgb(foreground)) as OklchColor
  const baseLightness = base.l
  const passes = (candidate: string): boolean => backgrounds.every(background => contrastRatio(candidate, background) >= minimum)
  const original = candidateAt(base, baseLightness)
  if (passes(original)) return original

  const directions = [-1, 1] as const
  const candidates: Array<{ value: string; delta: number }> = []
  for (const direction of directions) {
    const endpoint = direction < 0 ? 0 : 1
    const endpointValue = candidateAt(base, endpoint)
    if (!passes(endpointValue)) continue
    let low = Math.min(baseLightness, endpoint)
    let high = Math.max(baseLightness, endpoint)
    for (let iteration = 0; iteration < 32; iteration += 1) {
      const mid = (low + high) / 2
      const value = candidateAt(base, mid)
      if (passes(value)) {
        if (direction < 0) high = mid
        else low = mid
      } else if (direction < 0) {
        low = mid
      } else {
        high = mid
      }
    }
    const lightness = direction < 0 ? high : low
    const value = candidateAt(base, lightness)
    candidates.push({ value, delta: Math.abs(lightness - baseLightness) })
  }
  if (candidates.length === 0) {
    throw new ContrastCorrectionError(foreground, backgrounds, backgrounds.map(background => contrastRatio(original, background)))
  }
  candidates.sort((a, b) => a.delta - b.delta)
  return candidates[0]!.value
}
