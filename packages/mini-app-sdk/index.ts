import './globals'

export { init } from './init'
export { getHostLanguage, getHostFiat, requestDeviceIdentifier, requestFullscreen, exitFullscreen, getFullscreen, onFullscreenChange } from './host'
export { Fiat } from './types'
export { NimiqProviderError } from '@nimiq/web3-provider-nimiq'
export type { InitOptions, NimiqProvider } from './init'
export type { NimiqPayHostContext } from './globals'
export type { INimiqProviderConfig, SignatureResult, TransactionInfo, ErrorResponse, LightningPaymentResult } from '@nimiq/web3-provider-nimiq'
