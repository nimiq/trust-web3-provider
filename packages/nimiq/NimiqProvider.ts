

import { BaseProvider, type IRequestArguments } from '@trustwallet/web3-provider-core';
import type INimiqProvider from './types/NimiqProvider';
import type { INimiqProviderConfig } from './types/NimiqProvider';
import { RPCServer } from './RPCServer';

export interface SignatureResult {
  publicKey: string,
  signature: string,
}

export interface TransactionInfo {
  hash: string,
  blockNumber: number,
  timestamp: number,
  confirmations: number,
  size: number,
  relatedAddresses: string[],
  from: string,
  fromType: number,
  to: string,
  toType: number,
  value: number,
  fee: number,
  senderData: string,
  recipientData: string,
  flags: number,
  validityStartHeight: number,
  proof: string,
  networkId: number,
}

/** Legacy error returned by a wallet handler. */
export interface ErrorResponse {
  error: {
    type: string,
    message: string,
  },
}

// Keep host errors unchanged for older SDKs; the new SDK normalizes them in init().
export class NimiqProvider
  extends BaseProvider
  implements INimiqProvider
{
  static NETWORK = 'nimiq';

  static WALLET_METHODS = new Set([
    'listAccounts',
    'sign',
    'sendBasicTransaction',
    'sendBasicTransactionWithData',
    'sendNewStakerTransaction',
    'sendStakeTransaction',
    'sendSetActiveStakeTransaction',
    'sendUpdateStakerTransaction',
    'sendRetireStakeTransaction',
    'sendRemoveStakeTransaction',
  ]);

  #accounts: string[] | undefined;
  #rpcUrl: string | undefined;
  #rpc: RPCServer | undefined;

  constructor(config?: INimiqProviderConfig) {
    super();
    if (config?.rpc || config?.rpcUrl) {
      this.#rpcUrl = config.rpc || config.rpcUrl!;
      this.#rpc = new RPCServer(this.#rpcUrl);
    }
  }

  async connect() {
    await this.listAccounts();
  }

  disconnect() {
    this.#accounts = undefined;
    this.emit('disconnect');
  }

  getNetwork(): string {
    return NimiqProvider.NETWORK;
  }

  get connected(): boolean {
    return this.#accounts !== undefined;
  }

  async listAccounts(): Promise<string[] | ErrorResponse> {
    if (this.#accounts) {
      return this.#accounts;
    }
    const accounts = await super.request<string[] | ErrorResponse>({ method: 'listAccounts' });
    // A resolved wallet error must not mark the provider as connected or enter the cache.
    if (!Array.isArray(accounts)) return accounts;
    if (!this.#accounts) {
      this.emit('connect');
    }
    this.#accounts = accounts;
    return accounts;
  }

  sign(message: string | { message: string, isHex?: boolean }): Promise<SignatureResult | ErrorResponse> {
    return super.request<SignatureResult | ErrorResponse>({
      method: 'sign',
      params: typeof message === 'string' ? { message } : message,
    });
  }

  isConsensusEstablished(): Promise<boolean> {
    return super.request<boolean>({ method: 'isConsensusEstablished' });
  }

  getBlockNumber(): Promise<number> {
    return super.request<number>({ method: 'getBlockNumber' });
  }

  /**
   * Sign and send a basic transaction from the wallet
   * @param tx Transaction parameters: recipient, value, fee (optional), validityStartHeight (optional)
   * @returns The serialized transaction
   */
  sendBasicTransaction(tx: {
    recipient: string,
    value: number,
    fee?: number,
    validityStartHeight?: number,
  }): Promise<string | ErrorResponse> {
    return super.request<string | ErrorResponse>({
      method: 'sendBasicTransaction',
      params: tx,
    });
  }

  /**
   * Sign and send a basic transaction from the wallet
   * @param tx Transaction parameters: recipient, value, fee (optional), validityStartHeight (optional)
   * @returns The serialized transaction
   */
  sendBasicTransactionWithData(tx: {
    recipient: string,
    value: number,
    fee?: number,
    data: string,
    validityStartHeight?: number,
  }): Promise<string | ErrorResponse> {
    return super.request<string | ErrorResponse>({
      method: 'sendBasicTransactionWithData',
      params: tx,
    });
  }

  /**
   * Create a new staker with the given delegation and stake amount.
   * @param delegation Address of the validator to delegate to, e.g. 'NQ07 0000 0000 0000 0000 0000 0000 0000 0000'
   * @param value Amount in Lunas (1 NIM = 1e5 Lunas)
   */
  sendNewStakerTransaction(tx: {
    delegation: string,
    value: number,
    fee?: number,
    validityStartHeight?: number,
  }): Promise<string | ErrorResponse> {
    return super.request<string | ErrorResponse>({
      method: 'sendNewStakerTransaction',
      params: tx,
    });
  }

  /**
   * Add stake to an existing staker
   * @param value Amount in Lunas (1 NIM = 1e5 Lunas)
   */
  sendStakeTransaction(tx: {
    value: number,
    fee?: number,
    validityStartHeight?: number,
  }): Promise<string | ErrorResponse> {
    return super.request<string | ErrorResponse>({
      method: 'sendStakeTransaction',
      params: tx,
    });
  }

  /**
   * Set the active stake balance for an existing staker
   * @param newActiveBalance New active stake balance in Lunas (1 NIM = 1e5 Lunas)
   */
  sendSetActiveStakeTransaction(tx: {
    newActiveBalance: number,
    fee?: number,
    validityStartHeight?: number,
  }): Promise<string | ErrorResponse> {
    return super.request<string | ErrorResponse>({
      method: 'sendSetActiveStakeTransaction',
      params: tx,
    });
  }

  /**
   * Update the delegation for an existing staker
   * @param newDelegation Address of the new validator to delegate to, e.g. 'NQ07 0000 0000 0000 0000 0000 0000 0000 0000'
   * @param reactivateAllStake Automatically reactivates their stake after the reporting window time when executing this transaction. If false, the user needs to manually reactivate their stake after the reporting window time by sending a SetActiveStakeTransaction with the desired active stake balance.
   */
  sendUpdateStakerTransaction(tx: {
    newDelegation: string,
    reactivateAllStake?: boolean,
    fee?: number,
    validityStartHeight?: number,
  }): Promise<string | ErrorResponse> {
    return super.request<string | ErrorResponse>({
      method: 'sendUpdateStakerTransaction',
      params: tx,
    });
  }

  /**
   * Retire stake
   * @param retireStake Amount of stake to retire in Lunas (1 NIM = 1e5 Lunas)
   */
  sendRetireStakeTransaction(tx: {
    retireStake: number,
    fee?: number,
    validityStartHeight?: number,
  }): Promise<string | ErrorResponse> {
    return super.request<string | ErrorResponse>({
      method: 'sendRetireStakeTransaction',
      params: tx,
    });
  }

  /**
   * Remove (unstake) retired stake
   * @param value Amount of retired stake to remove in Lunas (1 NIM = 1e5 Lunas)
   */
  sendRemoveStakeTransaction(tx: {
    value: number,
    fee?: number,
    validityStartHeight?: number,
  }): Promise<string | ErrorResponse> {
    return super.request<string | ErrorResponse>({
      method: 'sendRemoveStakeTransaction',
      params: tx,
    });
  }

  // TODO: Add other transaction creation types

  async request<T>(args: IRequestArguments): Promise<T> {
    const walletMethod = args.method === 'nim_requestAccounts' ? 'listAccounts' : args.method;
    if (NimiqProvider.WALLET_METHODS.has(walletMethod)) {
      return super.request<T>({
        ...args,
        method: walletMethod,
      });
    }

    if (args.method === 'nim_isConsensusEstablished') {
      return super.request<T>({ ...args, method: 'isConsensusEstablished' });
    }

    if (!this.#rpc) {
      throw new Error(`No RPC URL configured. Call setRPCUrl() or pass rpcUrl in the constructor to use method "${args.method}".`);
    }

    return this.#rpc.call<T>({
      jsonrpc: '2.0',
      method: args.method,
      params: args.params,
    });
  }

  setRPCUrl(rpcUrl: string) {
    this.#rpcUrl = rpcUrl;
    this.#rpc = new RPCServer(this.#rpcUrl);
  }

  getRPC(): RPCServer | undefined {
    return this.#rpc;
  }

  setRPC(rpc: RPCServer) {
    this.#rpc = rpc;
  }
}
