import { useContext, useEffect } from "react";
import { UNSAFE_NavigationContext as NavigationContext } from "react-router-dom";
import type { History } from "history";

type BlockerFunction = (tx: { retry: () => void }) => void;

/**
 * Custom hook to block navigation when certain conditions are met.
 *
 * @param shouldBlock - A boolean indicating whether navigation should be blocked.
 * @param blockerFunction - A function that determines what happens when navigation is attempted.
 */
export function useBlocker(
    shouldBlock: boolean,
    blockerFunction: BlockerFunction
): void {
    const { navigator } = useContext(NavigationContext) as unknown as { navigator: History };

    useEffect(() => {
        if (!shouldBlock) return;

        const unblock = navigator.block((tx) => {
            const autoUnblockingTx = {
                ...tx,
                retry() {
                    unblock();
                    tx.retry();
                },
            };

            blockerFunction(autoUnblockingTx);
        });

        return unblock;
    }, [navigator, shouldBlock, blockerFunction]);
}
