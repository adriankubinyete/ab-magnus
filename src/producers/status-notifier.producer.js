import { EXCHANGES } from "../config/rabbit.js";
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
            contractId,
            fromStatus,
            toStatus,
            attempt,
            success,
        }
    };

    const routingKey = success
        ? `${EXCHANGES.STATUS_SYNCED}.succeeded`
        : `${EXCHANGES.STATUS_SYNCED}.failed"`

    console.log(`Sending payload to ${routingKey}`);
    await channelWrapper.publish(
        EXCHANGES.STATUS_SYNCED,
        routingKey,
        payload,
        {
            persistent: true,
            messageId: payload.id,
        }
    );
}
