import { findChangedContractsSinceLastRun } from "../services/status-sync.service.js";
import { publishStatusChange } from "../producers/status-change.producer.js";

let lastRun = new Date(Date.now() - 24 * 50 * 60 * 1000); // 50 days ago

export function startPolling() {
    setInterval(async () => {
        try {
            const now = new Date();
            const changes = await findChangedContractsSinceLastRun(lastRun);
            lastRun = now;

            for (const change of changes) {
                await publishStatusChange(change);
            }
        } catch (err) {
            console.error(`Error polling IXC contracts: ${err}`);
        }
    }, 30 * 60 * 1000); // every 30 min
}