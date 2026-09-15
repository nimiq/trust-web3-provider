import './globals'

export { init } from './init'
export { getHostLanguage, getHostFiat, requestDeviceIdentifier } from './host'
export { Fiat } from './types'
export { NimiqProviderError } from '@nimiq/web3-provider-nimiq'
export type { InitOptions, NimiqProvider } from './init'
export type { NimiqPayHostContext } from './globals'
export type { INimiqProviderConfig, SignatureResult, TransactionInfo, ErrorResponse } from '@nimiq/web3-provider-nimiq'
