import type { Fiat } from './types'

/**
 * ISO 639-1 language code selected by the user in Nimiq Pay, or `undefined`
 * when not running inside Nimiq Pay. Seeded synchronously before the Mini
 * App's page script runs, so safe to read during module init.
 */
export function getHostLanguage(): string | undefined {
  return typeof window === 'undefined' ? undefined : window.nimiqPay?.language
}

/**
 * Fiat currency selected by the user in Nimiq Pay, or `undefined`
 * when not running inside Nimiq Pay. Seeded synchronously before the Mini
 * App's page script runs, so safe to read during module init.
 */
export function getHostFiat(): Fiat | undefined {
  return typeof window === 'undefined' ? undefined : window.nimiqPay?.userFiat
}

/**
 * Request a pseudonymous, per-origin device identifier from Nimiq Pay.
 * Resolves with a 64-char hex SHA-256 string scoped to the Mini App's origin.
 * The identifier is stable across Nimiq Pay reinstalls and across different
 * user accounts on the same device — it identifies the device, not the user.
 * On the first call per origin the user is prompted with `reason`; subsequent
 * calls auto-resolve. Rejects when the user denies the prompt, when `reason`
 * is empty, or when the Mini App is not running inside Nimiq Pay.
 */
export function requestDeviceIdentifier(options: { reason: string }): Promise<string> {
  if (typeof window === 'undefined' || !window.nimiqPay?.requestDeviceIdentifier)
    return Promise.reject(new Error('requestDeviceIdentifier is unavailable. Are you running inside Nimiq Pay?'))
  return window.nimiqPay.requestDeviceIdentifier(options)
}

/** The Mini App must ask the user before each request. Nimiq Pay adds no prompt. */
export function requestFullscreen(): Promise<void> {
  if (typeof window === 'undefined' || !window.nimiqPay?.requestFullscreen)
    return Promise.reject(new Error('requestFullscreen is unavailable. Are you running inside Nimiq Pay?'))
  return window.nimiqPay.requestFullscreen()
}

export function exitFullscreen(): Promise<void> {
  if (typeof window === 'undefined' || !window.nimiqPay?.exitFullscreen)
    return Promise.reject(new Error('exitFullscreen is unavailable. Are you running inside Nimiq Pay?'))
  return window.nimiqPay.exitFullscreen()
}

export function getFullscreen(): Promise<boolean> {
  if (typeof window === 'undefined' || !window.nimiqPay?.getFullscreen)
    return Promise.reject(new Error('getFullscreen is unavailable. Are you running inside Nimiq Pay?'))
  return window.nimiqPay.getFullscreen()
}

export function onFullscreenChange(listener: (enabled: boolean) => void): () => void {
  if (typeof window === 'undefined' || !window.nimiqPay?.onFullscreenChange)
    throw new Error('onFullscreenChange is unavailable. Are you running inside Nimiq Pay?')
  return window.nimiqPay.onFullscreenChange(listener)
}
