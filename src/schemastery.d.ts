declare module '@deepseek-ai/schemastery' {
  interface SchemaLike {
    default(value: unknown): SchemaLike
    (value?: unknown): unknown
  }
  interface SchemaFactory {
    object(fields: Record<string, SchemaLike>): SchemaLike
    string(): SchemaLike
  }
  const Schema: SchemaFactory
  export default Schema
}
