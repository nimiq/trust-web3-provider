import type { NimiqProvider } from '@nimiq/web3-provider-nimiq'

/** Read-only host context injected by Nimiq Pay before a mini app loads. */
export interface NimiqPayHostContext {
  readonly language?: string
}

declare global {
  interface Window {
    nimiq?: NimiqProvider
    nimiqPay?: NimiqPayHostContext
  }
}
