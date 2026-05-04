declare module 'papaparse' {
  type ParseConfig = {
    header?: boolean
    skipEmptyLines?: boolean
  }

  type ParseResult<T> = {
    data: T[]
    meta: {
      fields?: string[]
    }
  }

  const Papa: {
    parse: <T = Record<string, unknown>>(csv: string, config?: ParseConfig) => ParseResult<T>
  }

  export default Papa
}
