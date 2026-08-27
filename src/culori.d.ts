declare module 'culori' {
  export interface ColorObject {
    readonly mode?: string
    readonly r?: number
    readonly g?: number
    readonly b?: number
    readonly l?: number
    readonly c?: number
    readonly h?: number
    readonly alpha?: number
    readonly [key: string]: unknown
  }
  export function parse(value: string): ColorObject | undefined
  export function converter(mode: string): (value: ColorObject | string) => ColorObject
  export function clampGamut(mode: string): (value: ColorObject) => ColorObject
  export function formatHex(value: ColorObject): string
  export function wcagContrast(a: ColorObject, b: ColorObject): number
  export function interpolate(values: readonly (ColorObject | string)[], mode: string): (t: number) => ColorObject
}
