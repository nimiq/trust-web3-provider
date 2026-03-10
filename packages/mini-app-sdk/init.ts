import type { NimiqProvider } from '@nimiq/web3-provider-nimiq'

export interface InitOptions {
  timeout?: number
}

export function init(options?: InitOptions): Promise<NimiqProvider> {
  if (window.nimiq) return Promise.resolve(window.nimiq)

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
        resolve(window.nimiq)
      }
    }, 50)
  })
}
