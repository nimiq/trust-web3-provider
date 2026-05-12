import type { NimiqProvider } from '@nimiq/web3-provider-nimiq'

/** Read-only host context injected by Nimiq Pay before a Mini App loads. */
export interface NimiqPayHostContext {
  readonly language?: string
  /**
   * Request a pseudonymous, per-origin device identifier (64-char hex SHA-256).
   * Prompts the user on first call per origin; subsequent calls auto-resolve.
   * The identifier is stable across Nimiq Pay reinstalls and across different
   * user accounts on the same device — it identifies the device, not the user.
   * @param options.reason shown verbatim to the user in the consent prompt
   * @throws if the user denies the prompt or if `reason` is empty
   */
  requestDeviceIdentifier: (options: { reason: string }) => Promise<string>
}

declare global {
  interface Window {
    nimiq?: NimiqProvider
    nimiqPay?: NimiqPayHostContext
  }
}
