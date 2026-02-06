import { getConnection, QUEUES, setupTopology } from "../config/rabbit";
import { updateMagnusStatus } from "../services/status-sync.service.js";

export async function startStatusUpdater() {
    const conn = await getConnection();
    const channelWrapper = conn.createChannel({
        json: true,
        setup: async channel => {
            await setupTopology(channel);
            await channel.prefetch(1); // 1 time per worker

            channel.consume(QUEUES.STATUS_UPDATE, async msg => {
                if (msg === null) return;

                try {
                    const payload = JSON.parse(msg.content.toString());
                    const { contractId, newStatus, attempt = 1 } = payload;

                    // idempotency: check if its already on desired status in magnus
                    const current = await getCurrentMagnusStatus(contractId);
                    if (current === mapToMagnusStatus(newStatus)) {
                        channel.ack(msg);
                        return;
                    }

                    await updateMagnusStatus(contractId, newStatus);

                    channel.ack(msg);
                } catch (err) {
                    const retries = parseInt(msg.properties.headers?.['x-retries'] || 0) + 1;

                    if (retries < 5) { // max 5 retries
                        // reject with requeue false -> goes to DLX
                        chanhnel.nack(msg, false, false)
                        console.warn(`Failed to update contract ${payload.contractId}, attempt ${retries}`);
                    } else {
                        // move to permanent DLQ or logs
                        channel.nack(msg, false, false)
                        //optional: send a notification?
                    }
                }
            });
        },
    });
}