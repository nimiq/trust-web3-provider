import { NimiqProviderError, type NimiqProvider as HostProvider, type SignatureResult } from '@nimiq/web3-provider-nimiq'

export interface NimiqProvider extends HostProvider {
  listAccounts(): Promise<string[]>
  sign(...args: Parameters<HostProvider['sign']>): Promise<SignatureResult>
  sendBasicTransaction(...args: Parameters<HostProvider['sendBasicTransaction']>): Promise<string>
  sendBasicTransactionWithData(...args: Parameters<HostProvider['sendBasicTransactionWithData']>): Promise<string>
  sendNewStakerTransaction(...args: Parameters<HostProvider['sendNewStakerTransaction']>): Promise<string>
  sendStakeTransaction(...args: Parameters<HostProvider['sendStakeTransaction']>): Promise<string>
  sendSetActiveStakeTransaction(...args: Parameters<HostProvider['sendSetActiveStakeTransaction']>): Promise<string>
  sendUpdateStakerTransaction(...args: Parameters<HostProvider['sendUpdateStakerTransaction']>): Promise<string>
  sendRetireStakeTransaction(...args: Parameters<HostProvider['sendRetireStakeTransaction']>): Promise<string>
  sendRemoveStakeTransaction(...args: Parameters<HostProvider['sendRemoveStakeTransaction']>): Promise<string>
}

export interface InitOptions {
  timeout?: number
}

const providers = new WeakMap<HostProvider, NimiqProvider>()
const WALLET_METHODS = new Set<string>([
  'listAccounts',
  'sign',
  'sendBasicTransaction',
  'sendBasicTransactionWithData',
  'sendNewStakerTransaction',
  'sendStakeTransaction',
  'sendSetActiveStakeTransaction',
  'sendUpdateStakerTransaction',
  'sendRetireStakeTransaction',
  'sendRemoveStakeTransaction',
])

function isWalletRequest(request: unknown): boolean {
  if (!request || typeof request !== 'object' || !('method' in request) || typeof request.method !== 'string') {
    return false
  }

  return WALLET_METHODS.has(request.method) || request.method === 'nim_requestAccounts'
}

function normalizeProvider(provider: HostProvider): NimiqProvider {
  const cached = providers.get(provider)
  if (cached) return cached

  const methods = new Map<PropertyKey, { original: unknown, wrapped: (...args: unknown[]) => unknown }>()
  // A separate target leaves the injected object intact, including frozen hosts.
  const wrapped = new Proxy(Object.create(provider), {
    get(_target, name) {
      // Host getters and methods must use the original instance's private fields.
      const method = Reflect.get(provider, name, provider)
      if (typeof method !== 'function' || name === 'constructor') return method
      const cachedMethod = methods.get(name)
      if (cachedMethod && cachedMethod.original === method) return cachedMethod.wrapped

      const call = (...args: unknown[]) => {
        // Legacy connect() discards listAccounts()'s resolved error response.
        if (name === 'connect') return wrapped.listAccounts().then(() => undefined)
        const normalizeErrors = typeof name === 'string'
          && (WALLET_METHODS.has(name) || (name === 'request' && isWalletRequest(args[0])))
        if (!normalizeErrors) {
          const result = Reflect.apply(method, provider, args)
          return result === provider ? wrapped : result
        }
        return (async () => {
          try {
            const result = await Reflect.apply(method, provider, args)
            const error = NimiqProviderError.fromLegacyResponse(result)
            if (error) throw error
            return result
          } catch (error) {
            throw NimiqProviderError.from(error) || error
          }
        })()
      }
      methods.set(name, { original: method, wrapped: call })
      return call
    },
    set(_target, name, value) {
      return Reflect.set(provider, name, value, provider)
    },
  }) as NimiqProvider
  providers.set(provider, wrapped)
  return wrapped
}

export function init(options?: InitOptions): Promise<NimiqProvider> {
  if (window.nimiq) return Promise.resolve(normalizeProvider(window.nimiq))

  return new Promise((resolve, reject) => {
    const ms = options?.timeout ?? 10_000
    const timer = setTimeout(() => {
      clearInterval(interval)
      reject(new Error('Nimiq provider was not injected. Are you running inside a Nimiq app?'))
    }, ms)

    const interval = setInterval(() => {
      if (window.nimiq) {
        clearTimeout(timer)
        clearInterval(interval)
        resolve(normalizeProvider(window.nimiq))
      }
    }, 50)
  })
}
