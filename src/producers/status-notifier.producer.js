import { EXCHANGES, PREFIX } from "../config/rabbit.js";
import { getConnection, setupTopology } from "../lib/rabbit/connection.js";
import crypto from "node:crypto";

let channelWrapper = null;

export async function initStatusNotifierProducer() {
    const conn = await getConnection();

    channelWrapper = conn.createChannel({
        json: true,
        setup: async channel => {
            await setupTopology(channel);
        },
    });
}

export async function publishStatusNotification({
    name,
    username,
    contractId,
    fromStatus,
    toStatus,
    attempt,
    success,
}) {
    if (!channelWrapper) throw new Error("Producer not initialized");

    const payload = {
        id: crypto.randomUUID(),
        occurredAt: new Date().toISOString(),
        data: {
            name,
            username,
            contractId,
            fromStatus,
            toStatus,
            attempt,
            success,
        },
    };

    console.log("Publishing status notification...");
    console.log(payload);

    await channelWrapper.publish(
        EXCHANGES.STATUS_SYNCED,
        `${PREFIX}notify.delayed`,
        payload,
        {
            persistent: true,
            messageId: payload.id,
        }
    );
}
