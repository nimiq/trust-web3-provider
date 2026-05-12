/**
 * ISO 639-1 language code selected by the user in Nimiq Pay, or `undefined`
 * when not running inside Nimiq Pay. Seeded synchronously before the Mini
 * App's page script runs, so safe to read during module init.
 */
export function getHostLanguage(): string | undefined {
  return typeof window === 'undefined' ? undefined : window.nimiqPay?.language
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
