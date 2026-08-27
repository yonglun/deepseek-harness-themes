declare module '*.module.css' {
  const classes: Readonly<Record<string, string>>
  export const disposeCss: () => void
  export default classes
}

declare module '*.module.css?dsh' {
  const classes: Readonly<Record<string, string>>
  export const disposeCss: () => void
  export default classes
}
