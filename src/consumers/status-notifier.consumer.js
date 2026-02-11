import { EXCHANGES, QUEUES } from "../config/rabbit.js";
import { CLIENT_STATUS } from "../config/status-map.js";
import { getConnection, setupTopology } from "../lib/rabbit/connection.js";
import { sendNotification } from "../services/discord-notify.service.js";

//RABBITMQ_CONSUMER_MAX_RETRIES
const MAX_RETRIES = Number(process.env.RABBITMQ_CONSUMER_MAX_RETRIES || 3);

function classifyStatusChange(from, to) {
    if (from !== CLIENT_STATUS.BLOCKED && to === CLIENT_STATUS.BLOCKED)
        return "BLOCKED";

    if (from === CLIENT_STATUS.BLOCKED && to !== CLIENT_STATUS.BLOCKED)
        return "UNBLOCKED";

    if (from === CLIENT_STATUS.INACTIVE && to === CLIENT_STATUS.ACTIVE)
        return "ACTIVATED";

    if (from === CLIENT_STATUS.ACTIVE && to === CLIENT_STATUS.INACTIVE)
        return "DEACTIVATED";

    return null;
}

export async function startStatusNotifierConsumer() {
    const conn = await getConnection();

    conn.createChannel({
        json: true,
        setup: async channel => {
            await setupTopology(channel);
            await channel.prefetch(1);

            await channel.consume(
                QUEUES.STATUS_NOTIFY,
                async msg => {
                    if (!msg) return;

                    console.log("Processing status notification...");

                    try {
                        const payload = JSON.parse(msg.content.toString());
                        const { data } = payload;

                        const {
                            name,
                            username,
                            contractId,
                            fromStatus,
                            toStatus,
                            attempt,
                            success,
                        } = data;

                        const action = classifyStatusChange(fromStatus, toStatus);
                        // this is dynamic, every key-value sent here goes to final message
                        await sendNotification({
                            type: action,
                            Nome: name,
                            Contrato: contractId,
                            Usuario: username,
                        });

                        channel.ack(msg);
                    } catch (err) {
                        console.error("Failed to process status notification", err);
                        channel.nack(msg, false, false); // DLQ se configurado
                    }
                }
            );
        },
    });
}
