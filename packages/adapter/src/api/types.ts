import { JWKInterface } from "arweave/node/lib/wallet";

declare global {
    interface Window {
        ethereum: {
            isMetaMask: boolean;
            isUnlocked: Promise<boolean>;
            request: (request: unknown | { method: string; params?: any[] }) => Promise<any>;
            on: (eventName: unknown, callback: unknown) => unknown;
        };
    }
}

export const SNAP_ID = `local:http://localhost:4000/`;

export type SnapId = typeof SNAP_ID;

export type IsEnabled = {
    method: "is_enabled";
};

export type GenerateWallet = {
    method: "generate_wallet";
};

/**
 * params[0] - bytes to sign
 * params[1] - saltLength
 */
export type SignBytes = {
    method: "sign_bytes";
    params: [Uint8Array, number];
};

export type GetPubKey = {
    method: "get_pub_key";
};

export type GetAddress = {
    method: "get_address";
};

export type RpcRequest = IsEnabled | GenerateWallet | SignBytes | GetPubKey | GetAddress;