import { getStatusChanges } from "../services/status-sync.service.js";
import { publishStatusChange } from "../producers/status-change.producer.js";

export async function runStatusSync(options = { publish: true}) {
    console.log(`Running status sync job @ ${new Date().toISOString()}`);
    const { publish } = options;

    const changes = await getStatusChanges();

    if (!publish) {
        console.warn(`${changes.length} changes found, publish will not happen due to options.publish:false`);
        return changes
    }

    for (const change of changes) {
        console.log(change);
        await publishStatusChange(change);
    }

    return changes;
}
