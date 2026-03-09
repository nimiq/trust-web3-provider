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
