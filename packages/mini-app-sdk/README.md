# Nimiq Mini App SDK

TypeScript helpers for Nimiq Mini Apps.

This package is intentionally small:

- `init()` waits for the host app to inject `window.nimiq`
- global typings make `window.nimiq` available in TypeScript
- provider types are re-exported for app-side DX

## Install

```bash
npm install @nimiq/mini-app-sdk
```

## Usage

If your Mini App wants to wait until the host app injects the provider, use `init()`:

```ts
import { init } from '@nimiq/mini-app-sdk'

const nimiq = await init()
const accounts = await nimiq.listAccounts()
```

Use the provider returned by `init()` for typed wallet errors.

## Configuration

```ts
import { init, type InitOptions } from '@nimiq/mini-app-sdk'

const options: InitOptions = {
  timeout: 10_000,
}

const nimiq = await init(options)
```

## Provider Access

`await init()` returns a typed wrapper around the injected provider. It shares
the host's account state and events, and repeated calls return the same wrapper.
`window.nimiq` keeps its original methods and error behavior for older SDKs.

## Wallet errors

Wallet methods on the provider returned by `init()` resolve with their success value and reject with a
`NimiqProviderError` when the host returns an error. They never resolve with an
`ErrorResponse`.

```ts
import { init, NimiqProviderError } from '@nimiq/mini-app-sdk'

const nimiq = await init()

try {
  const accounts = await nimiq.listAccounts() // string[]
} catch (error) {
  if (NimiqProviderError.is(error)) {
    console.error(error.type, error.message)
  } else {
    throw error
  }
}
```

`NimiqProviderError.is()` works across package and host bundle boundaries.

Nimiq Pay supplies `type`, `message`, and the original numeric RPC `code`.
Older versions only supply `code` and `message`; the SDK maps known codes to
error types and uses `UNKNOWN_ERROR` for unknown codes. It also accepts legacy
resolved `{ error: { type, message } }` responses.

When upgrading the SDK, use the provider returned by `init()` and replace
`'error' in result` checks with `try`/`catch`. Mini Apps using an older SDK keep
their existing behavior. The raw `ErrorResponse` type remains exported for
host integrations. Non-wallet RPC and status methods keep their original
results and errors.

## Bitcoin Lightning payments

```ts
const { hash, swapId } = await nimiq.payLightningInvoice({ invoice: 'lnbc...' })
```

The host asks the user to allow invoice lookup, choose NIM or USDT, and approve a self-custodial swap to BTC Lightning. A successful result means the payment transaction was submitted; Lightning settlement may still be pending. Fixed-amount BOLT11 invoices and fixed-amount LNURLs are supported. The invoice must match the host network.

Reusing an invoice rejects with `NimiqProviderError` type `DUPLICATE_PAYMENT`. `error.data` includes the known `hash` and `swapId` when the earlier attempt came from the same Mini App and wallet. An uncertain submission rejects with type `TRANSACTION_OUTCOME_UNKNOWN` and the same identifiers when known. Do not retry that invoice after an uncertain result.

## Address balances

`getBalance(address)` reads any valid Nimiq address on the network currently
active in the host. It does not request access to the user's accounts.

```ts
const nimiq = await init()
const balance = await nimiq.getBalance('NQ...')
```

The result is a number in luna, where 100,000 luna equals 1 NIM. A zero result
is a successful lookup.

Invalid addresses and network failures reject with `NimiqProviderError`, so use
the same `try`/`catch` pattern as other wallet methods. Older hosts do not expose
this method. Mini Apps that support older host versions can check
`typeof window.nimiq?.getBalance === 'function'` before calling it and ask the
user to update Nimiq Pay when it is unavailable.

## Host context

Nimiq Pay seeds the user's selected language and fiat currency into every
Mini App before the page script runs. Read them via the typed helpers
(`getHostLanguage()`, `getHostFiat()`) or directly from `window.nimiqPay`.
Use them to match the host locale and currency so users don't hit
English-only UI or unexpected price formats.

```ts
import { getHostLanguage, getHostFiat, Fiat } from '@nimiq/mini-app-sdk'

// ISO 639-1 code, e.g. 'en' | 'de' | 'es' | 'fr' | 'pt'
const locale = getHostLanguage() ?? navigator.language.split('-')[0] ?? 'en'

// ISO 4217 fiat code from the `Fiat` enum, e.g. Fiat.USD, Fiat.EUR
const fiat = getHostFiat() ?? Fiat.USD
```

These values are static for the lifetime of a Mini App session; when the
user changes them in Nimiq Pay, the Mini App picks them up the next time
it's opened. Always provide a fallback for Mini Apps that can also run
outside Nimiq Pay (standalone browser dev, etc.).

## Device identifier

For features that need a stable per-device handle (leaderboards, anti-spam,
save slots) request a pseudonymous device identifier. The first call per
origin prompts the user with the `reason` you provide; later calls resolve
silently.

```ts
import { requestDeviceIdentifier } from '@nimiq/mini-app-sdk'

try {
  const id = await requestDeviceIdentifier({ reason: 'Leaderboard ranking' })
  // 64-char hex SHA-256, stable for this Mini App on this device
} catch (err) {
  // user denied, reason was empty, or not running inside Nimiq Pay
}
```

The identifier is derived from a host-side device ID hashed with the Mini
App's origin, so it cannot be correlated across Mini Apps. It is stable
across Nimiq Pay reinstalls and across different user accounts on the same
device — it identifies the device, not the user. Do not use it as a user
identity for authentication; use it for device-scoped state.

## Fullscreen

Ask the user in your Mini App before each fullscreen request. Nimiq Pay does
not show another approval prompt. Users can exit through the native button;
Android Back also exits fullscreen. The current page, cookies, and history
stay loaded when fullscreen changes.

```ts
import { requestFullscreen, exitFullscreen, getFullscreen, onFullscreenChange } from '@nimiq/mini-app-sdk'

const stopWatching = onFullscreenChange((enabled) => {
  console.log('Fullscreen:', enabled)
})

button.addEventListener('click', async () => {
  if (window.confirm('Allow this Mini App to use fullscreen?'))
    await requestFullscreen()
})

// Call exitFullscreen() to leave from your own UI.
// Call getFullscreen() to refresh state after the app resumes.
// Call stopWatching() when the UI is removed.
```

These APIs require a compatible Nimiq Pay host. The helpers reject when the
host is unavailable; `onFullscreenChange` throws because it returns an
unsubscribe function. Fullscreen also exits when the app backgrounds, the
WebView hides or closes, or the Mini App navigates to another origin.
