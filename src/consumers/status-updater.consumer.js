import { QUEUES, EXCHANGES } from "../config/rabbit.js";
import { getConnection, setupTopology } from "../lib/rabbit/connection.js";
// import { updateMagnusStatus, getCurrentMagnusStatus } from "../services/status-sync.service.js";

//RABBITMQ_CONSUMER_MAX_RETRIES
const MAX_RETRIES = Number(process.env.RABBITMQ_CONSUMER_MAX_RETRIES || 3);

export async function startStatusUpdater() {
    const conn = await getConnection();

    conn.createChannel({
        json: true,
        setup: async channel => {
            await setupTopology(channel);
            await channel.prefetch(1);

            channel.consume(QUEUES.STATUS_UPDATE, async msg => {
                if (!msg) return;

                let payload;

                try {
                    payload = JSON.parse(msg.content.toString());

                    const {
                        contractId,
                        newStatus,
                    } = payload.data;

                    const retries =
                        Number(msg.properties.headers?.['x-retries'] || 0);

                    // idempotency
                    console.log(`Processing contract ${payload?.data?.contractId}`);
                    const current = await getCurrentMagnusStatus(contractId);
                    if (current === mapToMagnusStatus(newStatus)) {
                        channel.ack(msg);
                        return;
                    }

                    console.log(`Updating contract ${payload?.data?.contractId}`);
                    await updateMagnusStatus(contractId, newStatus);

                    channel.ack(msg);
                } catch (err) {
                    const retries =
                        Number(msg.properties.headers?.['x-retries'] || 0) + 1;

                    console.error(
                        `Failed to update contract ${payload?.data?.contractId}, attempt ${retries}`,
                        err
                    );

                    channel.ack(msg); // sempre remove da fila atual

                    if (retries < MAX_RETRIES) {
                        // retry com backoff (via TTL da retry queue)
                        channel.publish(
                            EXCHANGES.DLX,
                            'retry',
                            Buffer.from(JSON.stringify(payload)),
                            {
                                persistent: true,
                                headers: {
                                    ...msg.properties.headers,
                                    'x-retries': retries,
                                },
                            }
                        );
                    } else {
                        // erro permanente
                        channel.publish(
                            EXCHANGES.DLX,
                            'dead',
                            Buffer.from(JSON.stringify(payload)),
                            {
                                persistent: true,
                                headers: {
                                    ...msg.properties.headers,
                                    'x-retries': retries,
                                    'x-failed-at': new Date().toISOString(),
                                },
                            }
                        );
                    }
                }
            });
        },
    });
}
