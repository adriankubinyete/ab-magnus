// src/jobs/status-sync.job.js
import { getStatusChanges } from "../services/status-sync.service.js";
import { publishStatusChange } from "../producers/status-change.producer.js";

export async function runStatusSync() {
    console.log(`Running status sync job @ ${new Date().toISOString()}`);

    const changes = await getStatusChanges();

    for (const change of changes) {
        console.log(change);
        await publishStatusChange(change);
    }

    return changes.length;
}
