import type { IRequestArguments } from '@trustwallet/web3-provider-core';

export interface RPC {
  call<T>(payload: {
    jsonrpc: string;
    method: string;
    params: IRequestArguments['params'];
  }): Promise<T>;
}

export class RPCServer implements RPC {
  #rpcUrl: string;

  constructor(rpcUrl: string) {
    this.#rpcUrl = rpcUrl;
  }

  async call<T>(payload: {
    jsonrpc: string;
    method: string;
    params: IRequestArguments['params'];
  }): Promise<T> {
    const response = await fetch(this.#rpcUrl, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        id: new Date().getTime() + Math.floor(Math.random() * 1000),
        ...payload,
      }),
    });

    const json = await response.json();

    if (!json.result && json.error) {
      throw new Error(json.error.data || json.error.message || 'rpc error');
    }

    return json.result.data;
  }
}
