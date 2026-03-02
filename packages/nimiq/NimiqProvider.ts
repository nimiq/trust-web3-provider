

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

export interface ErrorResponse {
  error: {
    type: string,
    message: string,
  }
}

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
      return Promise.resolve(this.#accounts);
    }
    const accounts = await this.#internalRequest<string[] | ErrorResponse>({ method: 'listAccounts' });
    if ('error' in accounts) {
      return accounts;
    }
    if (!this.#accounts) {
      this.emit('connect');
    }
    this.#accounts = accounts;
    return accounts;
  }

  sign(message: string | { message: string, isHex?: boolean }): Promise<SignatureResult | ErrorResponse> {
    return this.#internalRequest<SignatureResult>({
      method: 'sign',
      params: typeof message === 'string' ? { message } : message,
    });
  }

  isConsensusEstablished(): Promise<boolean> {
    return this.#internalRequest<boolean>({ method: 'isConsensusEstablished' });
  }

  getBlockNumber(): Promise<number> {
    return this.#internalRequest<number>({ method: 'getBlockNumber' });
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
    return this.#internalRequest<string | ErrorResponse>({
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
    return this.#internalRequest<string | ErrorResponse>({
      method: 'sendBasicTransactionWithData',
      params: tx,
    });
  }

  sendNewStakerTransaction(tx: {
    delegation: string,
    value: number,
    fee?: number,
    validityStartHeight?: number,
  }): Promise<string | ErrorResponse> {
    return this.#internalRequest<string | ErrorResponse>({
      method: 'sendNewStakerTransaction',
      params: tx,
    });
  }

  sendStakeTransaction(tx: {
    value: number,
    fee?: number,
    validityStartHeight?: number,
  }): Promise<string | ErrorResponse> {
    return this.#internalRequest<string | ErrorResponse>({
      method: 'sendStakeTransaction',
      params: tx,
    });
  }

  sendSetActiveStakeTransaction(tx: {
    newActiveBalance: number,
    fee?: number,
    validityStartHeight?: number,
  }): Promise<string | ErrorResponse> {
    return this.#internalRequest<string | ErrorResponse>({
      method: 'sendSetActiveStakeTransaction',
      params: tx,
    });
  }

  sendUpdateStakerTransaction(tx: {
    newDelegation: string,
    reactivateAllStake?: boolean,
    fee?: number,
    validityStartHeight?: number,
  }): Promise<string | ErrorResponse> {
    return this.#internalRequest<string | ErrorResponse>({
      method: 'sendUpdateStakerTransaction',
      params: tx,
    });
  }

  sendRetireStakeTransaction(tx: {
    retireStake: number,
    fee?: number,
    validityStartHeight?: number,
  }): Promise<string | ErrorResponse> {
    return this.#internalRequest<string | ErrorResponse>({
      method: 'sendRetireStakeTransaction',
      params: tx,
    });
  }

  sendRemoveStakeTransaction(tx: {
    value: number,
    fee?: number,
    validityStartHeight?: number,
  }): Promise<string | ErrorResponse> {
    return this.#internalRequest<string | ErrorResponse>({
      method: 'sendRemoveStakeTransaction',
      params: tx,
    });
  }

  // TODO: Add other transaction creation types

  async request<T>(args: IRequestArguments): Promise<T> {
    if (NimiqProvider.WALLET_METHODS.has(args.method)) {
      return this.#internalRequest<T>(args);
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

  /**
   * Call request handler directly
   * @param args
   * @returns
   */
  #internalRequest<T>(args: IRequestArguments): Promise<T> {
    return super.request<T>(args);
  }
}
