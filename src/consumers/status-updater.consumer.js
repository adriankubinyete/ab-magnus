import { QUEUES, EXCHANGES } from "../config/rabbit.js";
import { getConnection, setupTopology } from "../lib/rabbit/connection.js";
import { publishStatusNotification } from "../producers/status-notifier.producer.js";
import { updateMagnusUserStatus } from "../services/status-sync.service.js";

//RABBITMQ_CONSUMER_MAX_RETRIES
const MAX_RETRIES = Number(process.env.RABBITMQ_CONSUMER_MAX_RETRIES || 3);

export async function startStatusUpdaterConsumer() {
    const conn = await getConnection();

    conn.createChannel({
        json: true,
        setup: async channel => {
            await setupTopology(channel);
            await channel.prefetch(1);

            channel.consume(QUEUES.STATUS_UPDATE, async msg => {
                if (!msg) return;

                let payload;
                let retries = (msg.properties.headers?.['x-retries'] || 0);
                const attempt = retries + 1;

                try {
                    payload = JSON.parse(msg.content.toString());

                    const {
                        contractId,
                        magnusUsername,
                        magnusUserId,
                        fromStatus,
                        toStatus,
                    } = payload.data;
                    console.log(`Processing contract ${contractId}`);

                    // idempotency
                    // const current = await getCurrentMagnusStatus(contractId);
                    // if (current === magnus(newStatus)) {
                    //     channel.ack(msg);
                    //     return;
                    // }

                    console.log(`Updating contract ${contractId} from ${fromStatus} to ${toStatus}`);
                    await updateMagnusUserStatus(magnusUserId, toStatus);

                    await publishStatusNotification({
                        name: payload._meta.magnusUser,
                        username: payload._meta.magnusUsername,
                        contractId,
                        fromStatus,
                        toStatus,
                        attempt,
                        success: true,
                    });

                    channel.ack(msg);
                } catch (err) {
                    retries = retries + 1;

                    console.error(
                        `Failed to update contract ${payload?.data?.contractId}, attempt ${attempt}`,
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
