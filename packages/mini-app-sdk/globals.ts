import type { NimiqProvider } from '@nimiq/web3-provider-nimiq'

declare global {
  interface Window {
    nimiq?: NimiqProvider
  }
}

export {}
