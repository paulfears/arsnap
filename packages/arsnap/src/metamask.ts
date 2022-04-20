import { deriveBIP44AddressKey, JsonBIP44CoinTypeNode } from "@metamask/key-tree";

import { RpcRequest, RpcResponse } from "@pianity/arsnap-adapter";

export type RpcMessageHandlerCallback = (
    originString: string,
    requestObject: RpcRequest,
) => Promise<RpcResponse>;

interface MetamaskWallet {
    registerRpcMessageHandler: (fn: RpcMessageHandlerCallback) => unknown;
    request(options: { method: string; params?: unknown[] }): Promise<unknown>;
}

declare global {
    interface Window {
        wallet: MetamaskWallet;
    }
}

export async function registerRpcMessageHandler(callback: RpcMessageHandlerCallback) {
    window.wallet.registerRpcMessageHandler(callback);
}

export function confirmPopup(
    prompt: string,
    description: string,
    textAreaContent: string,
): Promise<boolean> {
    return window.wallet.request({
        method: "snap_confirm",
        params: [
            {
                prompt,
                description,
                textAreaContent,
            },
        ],
    }) as Promise<boolean>;
}

export function notify(message: string, type = "native"): Promise<void> {
    return window.wallet.request({
        method: "snap_notify",
        params: [
            {
                type,
                message,
            },
        ],
    }) as Promise<void>;
}

export async function getSecret(): Promise<Buffer> {
    // m / purpose' / coin_type' / account' / change / address_index
    // m / 44' / 472' / 0' / 0 / 0
    // const [, , coinType, account, change, addressIndex] = derivationPath.split('/');
    const account = 0;
    const change = 0;
    const addressIndex = 0;
    const bip44Code = 472;

    const arweaveNode = (await window.wallet.request({
        method: `snap_getBip44Entropy_${bip44Code}`,
        params: [],
    })) as JsonBIP44CoinTypeNode;

    const secret = deriveBIP44AddressKey(arweaveNode, {
        account,
        change,
        address_index: addressIndex,
    });

    return secret;
}
