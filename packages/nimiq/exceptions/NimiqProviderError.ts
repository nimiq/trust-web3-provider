interface ErrorDetails {
  type: string;
  message: string;
}

interface CallbackError {
  code: number;
  message: string;
}

// Older Nimiq Pay versions send RPC codes without the wallet error type.
const ERROR_TYPE_BY_CODE: Record<number, string> = {
  4001: 'PERMISSION_DENIED',
  4200: 'UNKNOWN_REQUEST',
  [-32602]: 'INVALID_TRANSACTION',
  [-32000]: 'NETWORK_ERROR',
  [-32603]: 'INTERNAL_ERROR',
};

function isErrorDetails(error: unknown): error is ErrorDetails {
  return !!error
    && typeof error === 'object'
    && 'type' in error
    && typeof error.type === 'string'
    && 'message' in error
    && typeof error.message === 'string';
}

function isCallbackError(error: unknown): error is CallbackError {
  return !!error
    && typeof error === 'object'
    && 'code' in error
    && typeof error.code === 'number'
    && 'message' in error
    && typeof error.message === 'string';
}

export class NimiqProviderError extends Error {
  readonly type: string;
  readonly code?: number;

  constructor(type: string, message: string, code?: number) {
    super(message);
    this.name = 'NimiqProviderError';
    this.type = type;
    this.code = code;
  }

  static is(error: unknown): error is NimiqProviderError {
    return isErrorDetails(error)
      && 'name' in error
      && error.name === 'NimiqProviderError'
      && (!('code' in error) || error.code === undefined || typeof error.code === 'number');
  }

  static fromLegacyResponse(response: unknown): NimiqProviderError | undefined {
    if (response && typeof response === 'object' && 'error' in response && isErrorDetails(response.error)) {
      return new NimiqProviderError(response.error.type, response.error.message);
    }

    return undefined;
  }

  static from(error: unknown): NimiqProviderError | undefined {
    if (error instanceof NimiqProviderError) return error;

    if (NimiqProviderError.is(error)) {
      return new NimiqProviderError(error.type, error.message, error.code);
    }

    const legacyError = NimiqProviderError.fromLegacyResponse(error);
    if (legacyError) return legacyError;

    if (isCallbackError(error)) {
      const type = 'type' in error && typeof error.type === 'string'
        ? error.type
        : ERROR_TYPE_BY_CODE[error.code] || 'UNKNOWN_ERROR';
      return new NimiqProviderError(type, error.message, error.code);
    }

    return undefined;
  }
}
