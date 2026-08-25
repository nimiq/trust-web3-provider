export class NimiqProviderError extends Error {
  readonly type: string;

  constructor(type: string, message: string) {
    super(message);
    this.name = 'NimiqProviderError';
    this.type = type;
  }

  static is(error: unknown): error is NimiqProviderError {
    return !!error
      && typeof error === 'object'
      && 'name' in error
      && error.name === 'NimiqProviderError'
      && 'type' in error
      && typeof error.type === 'string'
      && 'message' in error
      && typeof error.message === 'string';
  }
}
