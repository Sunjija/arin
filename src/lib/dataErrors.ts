import type { DataErrorCode } from '../types/contracts'

export class DataError extends Error {
  readonly code: DataErrorCode

  constructor(code: DataErrorCode, message: string) {
    super(message)
    this.name = 'DataError'
    this.code = code
  }
}

export function isDataError(value: unknown): value is DataError {
  return value instanceof DataError
}
