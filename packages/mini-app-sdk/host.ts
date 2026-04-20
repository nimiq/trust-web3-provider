/**
 * ISO 639-1 language code selected by the user in Nimiq Pay, or `undefined`
 * when not running inside Nimiq Pay. Seeded synchronously before the mini
 * app's page script runs, so safe to read during module init.
 */
export function getHostLanguage(): string | undefined {
  return typeof window === 'undefined' ? undefined : window.nimiqPay?.language
}
