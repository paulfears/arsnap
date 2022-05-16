import { useState } from "react";
import { JWKInterface } from "arweave/node/lib/wallet";

import { NamedAddress, Wallets } from "@/utils/types";
import WalletOpenedMenu from "@/components/WalletMenu/WalletOpenedMenu";

export type SelectWallet = {
    event: "selectWallet";
    address: string;
};

export type RenameWallet = {
    event: "renameWallet";
    name: string;
    address: string;
};

export type ImportWallet = {
    event: "importWallet";
    jwk: JWKInterface;
};

export type ExportWallet = {
    event: "exportWallet";
    address: string;
};

export type DeleteWallet = {
    event: "deleteWallet";
    address: string;
};

export type WalletMenuEvent =
    | SelectWallet
    | RenameWallet
    | ImportWallet
    | ExportWallet
    | DeleteWallet;

export type WalletMenuEventResponse = {
    wallet?: NamedAddress;
    jwk?: JWKInterface;
};

export type OnWalletMenuEvent<T = WalletMenuEvent> = (event: T) => Promise<WalletMenuEventResponse>;

export type OnFileBrowserEvent = (state: "opened" | "closed") => void;

export type WalletMenuProps = {
    activeWallet: string;
    availableWallets: Wallets;
    onEvent: OnWalletMenuEvent;
};
export default function WalletMenu({
    activeWallet,
    availableWallets,
    onEvent: onEventRaw,
}: WalletMenuProps) {
    const [menuOpened, setMenuOpened] = useState(false);

    // This is a dirty hack to prevent `onBlur` of the main div here from firing when the file
    // browser is opened (when user wants to import a wallet).
    const [fileBrowserState, setFileBrowserState] = useState<"notOpened" | "opened" | "closed">(
        "notOpened",
    );

    // Hijacking WalletItem's onEvent to close the menu when a new wallet has been selected
    function onEvent(e: WalletMenuEvent): Promise<WalletMenuEventResponse> {
        if (e.event === "selectWallet") {
            setMenuOpened(false);
        }
        return onEventRaw(e);
    }

    return (
        <>
            <div
                tabIndex={0}
                onClick={() => setMenuOpened(!menuOpened)}
                onBlur={(e) => {
                    if (
                        !e.currentTarget.contains(e.relatedTarget) &&
                        fileBrowserState === "notOpened"
                    ) {
                        setMenuOpened(false);
                    }

                    if (fileBrowserState === "closed") {
                        setFileBrowserState("notOpened");
                    }
                }}
            >
                <label>wallet</label>
                <span>
                    {activeWallet && availableWallets
                        ? availableWallets.get(activeWallet)
                        : "loading wallets..."}
                </span>

                {menuOpened && (
                    <WalletOpenedMenu
                        activeWallet={activeWallet}
                        availableWallets={availableWallets}
                        onEvent={onEvent}
                        onFileBrowserEvent={setFileBrowserState}
                    />
                )}
            </div>
        </>
    );
}
