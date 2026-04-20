# Nimiq Mini App SDK

TypeScript helpers for Nimiq mini apps.

This package is intentionally small:

- `init()` waits for the host app to inject `window.nimiq`
- global typings make `window.nimiq` available in TypeScript
- provider types are re-exported for app-side DX

## Install

```bash
npm install @nimiq/mini-app-sdk
```

## Usage

If your mini app wants to wait until the host app injects the provider, use `init()`:

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

## Host context (user language)

Nimiq Pay seeds the user's selected language into every mini app before the
page script runs. Read it via `getHostLanguage()` (typed helper) or directly
from `window.nimiqPay.language`. Use it to match the host locale so users
don't hit English-only UI when they've chosen another language in Nimiq Pay.

```ts
import { getHostLanguage } from '@nimiq/mini-app-sdk'

// ISO 639-1 code, e.g. 'en' | 'de' | 'es' | 'fr' | 'pt'
const locale = getHostLanguage() ?? navigator.language.split('-')[0] ?? 'en'
```

The value is static for the lifetime of a mini-app session; when the host
language changes, the mini app picks it up the next time it's opened. Always
fall back to `navigator.language` for mini apps that can also run outside
Nimiq Pay (standalone browser dev, etc.).
