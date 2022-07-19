import { RequestEvent, RpcEvent, RpcRequest, RpcResponse } from "@pianity/arsnap-adapter";

import * as handlers from "@/handlers";
import { registerRpcMessageHandler } from "@/metamask";
import { getState, initializeState, replaceState, State } from "@/state";
import { exhaustive, ownerToAddress } from "@/utils";
import { guard } from "@/permissions";

async function getRpcEvent(request: RpcRequest): Promise<RpcEvent> {
    const { method, params } = request;

    switch (method) {
        case "is_enabled":
        case "get_dapps_permissions":
        case "get_permissions":
        case "revoke_all_permissions":
        case "get_active_address":
        case "get_active_public_key":
        case "get_all_addresses":
        case "get_wallet_names":
        case "get_events":
        case "clear_events":
            return { method };

        case "request_permissions":
        case "revoke_permissions":
            return { method, permissions: params[0] };

        case "revoke_dapp_permissions":
            return { method, dappOrigin: params[0], permissions: params[1] };

        case "sign_bytes":
            return { method, bytesLength: params[0].length };

        case "set_active_address":
            return { method, address: params[0] };

        case "import_wallet":
            return { method, address: await ownerToAddress(params[0].n), name: params[1] ?? "" };

        case "export_wallet":
            return { method, address: params[0] };

        case "rename_wallet":
            return { method, address: params[0], name: params[1] };

        case "delete_wallet":
            return { method, address: params[0] };

        default:
            return exhaustive(method);
    }
}

async function registerRequestEvent(state: State, origin: string, request: RpcRequest) {
    // Don't register "is_enabled" and "get_permissions" requests, they're not interesting as they
    // don't require any permissions.
    if (request.method === "is_enabled" || request.method === "get_permissions") {
        return;
    }

    const event: RequestEvent = {
        timestamp: Date.now(),
        origin,
        request: await getRpcEvent(request),
    };

    const { events: allEvents, eventsStorageLimit } = state;

    const events = allEvents.get(origin) ?? [];

    if (events.unshift(event) > eventsStorageLimit) {
        events.splice(eventsStorageLimit, events.length - eventsStorageLimit);
    }

    allEvents.set(origin, events);
}

registerRpcMessageHandler(async (origin, request): Promise<RpcResponse> => {
    const [maybeState, releaseState] = await getState();

    const state = maybeState || (await initializeState());

    let response;

    try {
        response = await handleRequest(state, origin, request);

        await registerRequestEvent(state, origin, request);

        // eslint-disable-next-line no-useless-catch
    } catch (e) {
        throw e;
    } finally {
        try {
            await replaceState(state);
        } finally {
            releaseState();
        }
    }

    return response;
});

async function handleRequest(
    state: State,
    origin: string,
    request: RpcRequest,
): Promise<RpcResponse> {
    const permissions = state.permissions.get(origin) || [];
    const { method, params } = request;

    switch (method) {
        case "is_enabled":
            return await handlers.isEnabled();

        case "get_permissions":
            return await handlers.getPermissions(state, origin);

        case "request_permissions":
            return await handlers.requestPermissions(state, origin, ...params);

        case "revoke_permissions":
            return await handlers.revokePermissions(state, origin, ...params);

        case "revoke_all_permissions":
            return await handlers.revokeAllPermissions(state, origin);

        case "get_dapps_permissions":
            await guard(origin, permissions, "GET_DAPPS_PERMISSIONS");
            return await handlers.getDappsPermissions(state);

        case "revoke_dapp_permissions":
            await guard(origin, permissions, "REVOKE_DAPP_PERMISSIONS");
            return await handlers.revokeDappPermissions(state, ...params);

        case "get_active_address":
            await guard(origin, permissions, "GET_ACTIVE_ADDRESS");
            return await handlers.getActiveAddress(state);

        case "get_active_public_key":
            await guard(origin, permissions, "GET_ACTIVE_PUBLIC_KEY");
            return await handlers.getActivePublicKey(state);

        case "get_all_addresses":
            await guard(origin, permissions, "GET_ALL_ADDRESSES");
            return await handlers.getAllAddresses(state);

        case "get_wallet_names":
            await guard(origin, permissions, "GET_ALL_ADDRESSES");
            return await handlers.getWalletNames(state);

        case "sign_bytes":
            await guard(origin, permissions, "SIGN");
            return await handlers.signBytes(state, ...params);

        case "set_active_address":
            await guard(origin, permissions, "SET_ACTIVE_ADDRESS");
            return await handlers.setActiveAddress(state, ...params);

        case "import_wallet":
            await guard(origin, permissions, "IMPORT_WALLET");
            return await handlers.importWallet(state, ...params);

        case "export_wallet":
            await guard(origin, permissions, "EXPORT_WALLET");
            return await handlers.exportWallet(state, origin, ...params);

        case "rename_wallet":
            await guard(origin, permissions, "RENAME_WALLET");
            return await handlers.renameWallet(state, ...params);

        case "delete_wallet":
            await guard(origin, permissions, "DELETE_WALLET");
            return await handlers.deleteWallet(state, origin, ...params);

        case "get_events":
            await guard(origin, permissions, "GET_EVENTS");
            return Array.from(state.events.entries());

        case "clear_events":
            await guard(origin, permissions, "CLEAR_EVENTS");
            state.events.clear();
            return null;

        default:
            return exhaustive(method);
    }
}
