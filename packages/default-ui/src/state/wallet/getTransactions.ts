import { Dispatch } from "react";

import Api from "@/graphql/api";
import { IncomingTransactionsQuery, OutgoingTransactionsQuery } from "@/graphql/arweave";
import { TransactionDirection, Transactions, WalletAction } from "@/state/wallet";

function gqlToTransaction(
    gqlTxs: IncomingTransactionsQuery | OutgoingTransactionsQuery,
    direction: TransactionDirection,
) {
    const transactions: Transactions = gqlTxs.transactions.edges.map(
        ({ cursor: _cursor, node }) => ({
            id: node.id,
            direction,
            amount: node.quantity.ar,
            timestamp: node.block?.timestamp ?? 0,
        }),
    );

    return transactions;
}

async function getTransactions(address: string): Promise<Transactions> {
    const outgoings = gqlToTransaction(
        await Api.outgoingTransactions({ address, limit: 10 }),
        "out",
    );
    const incomings = gqlToTransaction(
        await Api.incomingTransactions({ address, limit: 10 }),
        "in",
    );

    return outgoings.concat([...incomings]).sort((a, b) => b.timestamp - a.timestamp);
}

export async function updateTransactions(address: string, dispatch: Dispatch<WalletAction>) {
    const transactions = await getTransactions(address);

    dispatch({
        type: "setTransactions",
        transactions,
    });
}