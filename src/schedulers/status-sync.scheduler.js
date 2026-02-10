import { getStatusChanges } from "../services/status-sync.service.js";
import { publishStatusChange } from "../producers/status-change.producer.js";


//  15 -> 00:00, 00:15, 00:30, 00:45
//  30 -> 00:00, 00:30, 01:00, 01:30
//  60 -> 00:00, 01:00, 02:00, 03:00
// 120 -> 00:00, 02:00, 04:00, 06:00
function getMsUntilNextTick(intervalMinutes) {
    const now = new Date();

    const minutesSinceMidnight =
        now.getHours() * 60 + now.getMinutes();

    const nextTickMinutes =
        Math.ceil(minutesSinceMidnight / intervalMinutes) * intervalMinutes;

    const nextTick = new Date(now);
    nextTick.setHours(0, nextTickMinutes, 0, 0);

    if (nextTick <= now) {
        nextTick.setMinutes(nextTick.getMinutes() + intervalMinutes);
    }

    return nextTick.getTime() - now.getTime();
}

export function startPolling() {
    const intervalMinutes =
        Number(process.env.POLLING_RATE_MINUTES) || 30;

    console.log(
        `Starting status sync scheduler (every ${intervalMinutes} minutes)`
    );

    const run = async () => {
        try {
            const count = await runStatusSync();
            console.log(`Status sync finished (${count} changes)`);
        } catch (err) {
            console.error('Status sync failed');
            console.error(err);
        } finally {
            setTimeout(run, getMsUntilNextTick(intervalMinutes));
        }
    };

    setTimeout(run, getMsUntilNextTick(intervalMinutes));
}
