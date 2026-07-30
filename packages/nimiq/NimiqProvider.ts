

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
    'sendNewHtlcTransaction',
    'sendRedeemRegularHtlcTransaction',
    'sendRedeemTimeoutHtlcTransaction',
    'sendRedeemEarlyHtlcTransaction',
    'signRedeemEarlyHtlcTransaction',
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
    return this.#internalRequest<string | ErrorResponse>({
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
    return this.#internalRequest<string | ErrorResponse>({
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
    return this.#internalRequest<string | ErrorResponse>({
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
    return this.#internalRequest<string | ErrorResponse>({
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
    return this.#internalRequest<string | ErrorResponse>({
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
    return this.#internalRequest<string | ErrorResponse>({
      method: 'sendRemoveStakeTransaction',
      params: tx,
    });
  }

  /**
   * Create a Hash Time Locked Contract (HTLC)
   * @param htlcSender The address of the sender of the HTLC (can redeem after timelock expiration) - uses own address if not provided
   * @param htlcRecipient The address of the recipient of the HTLC (can redeem before timelock expiration)
   * @param hashRoot The hash root of the contract which the recipient needs to fulfill with the hash preimage in the redemption proof
   * @param hashCount The number of times the preimage gets hashed to fulfill the hash root
   * @param hashAlgorithm Which hashing algorithm the HTLC uses
   * @param timeoutMs The time, in Unix time with millisecond precision, when the contract expires
   * @param value Amount to lock in the contract, in Lunas (1 NIM = 1e5 Lunas)
   */
  sendNewHtlcTransaction(tx: {
    htlcSender?: string,
    htlcRecipient: string,
    hashRoot: string,
    hashCount: number,
    hashAlgorithm: 'blake2b' | 'sha256' | 'sha512',
    timeout: number,
    value: number,
    fee?: number,
    validityStartHeight?: number,
  }): Promise<string | ErrorResponse> {
    return this.#internalRequest<string | ErrorResponse>({
      method: 'sendNewHtlcTransaction',
      params: tx,
    });
  }

  /**
   * Redeem a HTLC before the timeout by providing the hash preimage (the signer must be the htlcRecipient of the HTLC)
   * @param contractAddress The address of the HTLC contract to redeem from
   * @param recipient The address of the recipient of the transaction - uses own address if not provided
   * @param preImage The redemption proof preimage
   * @param hashRoot The hash root the preimage hashes to
   * @param hashCount The number of times the preimage is hashed to create the hash root
   * @param hashAlgorithm Which hashing algorithm the HTLC uses
   * @param value The amount to redeem from the HTLC
   */
  sendRedeemRegularHtlcTransaction(tx: {
    contractAddress: string,
    recipient?: string,
    preImage: string,
    hashRoot: string,
    hashCount: number,
    hashAlgorithm: 'blake2b' | 'sha256' | 'sha512',
    value: number,
    fee?: number,
    validityStartHeight?: number,
  }): Promise<string | ErrorResponse> {
    return this.#internalRequest<string | ErrorResponse>({
      method: 'sendRedeemRegularHtlcTransaction',
      params: tx,
    });
  }

  /**
   * Redeem a HTLC after the timeout (the signer must be the htlcSender of the HTLC)
   * @param contractAddress The address of the HTLC contract to redeem from
   * @param recipient The address of the recipient of the transaction - uses own address if not provided
   * @param value The amount to redeem from the HTLC
   */
  sendRedeemTimeoutHtlcTransaction(tx: {
    contractAddress: string,
    recipient?: string,
    value: number,
    fee?: number,
    validityStartHeight?: number,
  }): Promise<string | ErrorResponse> {
    return this.#internalRequest<string | ErrorResponse>({
      method: 'sendRedeemTimeoutHtlcTransaction',
      params: tx,
    });
  }

  /**
   * Redeem a HTLC before the timeout without providing the preimage, in cooperation between the htlcSender and htlcRecipient
   * @param contractAddress The address of the HTLC contract to redeem from
   * @param recipient The address of the recipient of the transaction - uses own address if not provided
   * @param htlcSenderSignature The signature of the htlcSender - create it with `signRedeemEarlyHtlcTransaction`
   * @param htlcRecipientSignature The signature of the htlcRecipient - create it with `signRedeemEarlyHtlcTransaction`
   * @param value The amount to redeem from the HTLC
   */
  sendRedeemEarlyHtlcTransaction(tx: {
    contractAddress: string,
    recipient?: string,
    htlcSenderSignature: string,
    htlcRecipientSignature: string,
    value: number,
    fee?: number,
    validityStartHeight: number,
  }): Promise<string | ErrorResponse> {
    return this.#internalRequest<string | ErrorResponse>({
      method: 'sendRedeemEarlyHtlcTransaction',
      params: tx,
    });
  }

  /**
   * Create a signature to use with `sendRedeemEarlyHtlcTransaction`
   * @param contractAddress The address of the HTLC contract to redeem from
   * @param recipient The address of the recipient of the transaction - uses own address if not provided
   * @param value The amount to redeem from the HTLC
   */
  signRedeemEarlyHtlcTransaction(tx: {
    contractAddress: string,
    recipient?: string,
    value: number,
    fee?: number,
    validityStartHeight: number,
  }): Promise<string | ErrorResponse> {
    return this.#internalRequest<string | ErrorResponse>({
      method: 'signRedeemEarlyHtlcTransaction',
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
