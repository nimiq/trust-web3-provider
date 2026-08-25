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

After that import, `window.nimiq` is typed as `NimiqProvider`.

## Configuration

```ts
import { init, type InitOptions } from '@nimiq/mini-app-sdk'

const options: InitOptions = {
  timeout: 10_000,
}

const nimiq = await init(options)
```

## Provider Access

The injected provider is available in both places:

- `const nimiq = await init()`
- `window.nimiq`

Both are typed as `NimiqProvider`.

## Wallet errors

Wallet methods resolve with their success value and reject with a
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

`NimiqProviderError.is()` works across package and host bundle boundaries. The
`type` value is supplied by the host and can be used for programmatic handling;
`message` contains its human-readable description.

Code written for older SDK versions must replace resolved-value checks such as
`'error' in result` with `try`/`catch`. The raw `ErrorResponse` type remains
exported for host integrations, but Mini Apps do not need to handle it.

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
