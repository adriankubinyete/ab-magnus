import { EXCHANGES } from "../config/rabbit.js";
import { getConnection, setupTopology } from "../lib/rabbit/connection.js";
import crypto from 'node:crypto';

let channelWrapper = null;

export async function initStatusChangeProducer() {
    const conn = await getConnection();

    channelWrapper = conn.createChannel({
        json: true,
        setup: async channel => {
            await setupTopology(channel); // make exchanges/queues
        },
    });
}

/*
changes.push({
    contract: contract.id,
    from: currentStatus,
    to: targetStatus,
    _meta: {
        contract: {
            id: contract.id,
            status: contract.status,
            status_internet: contract.status_internet,
        },
        magnus: {
            userId: magnusData.id,
            userStatus: magnusData.status,
            name: magnusData.name,
        }
    },
});
*/

export async function publishStatusChange(change) {
    if (!channelWrapper) throw new Error('Producer not initialized');

    const payload = {
        id: crypto.randomUUID(),
        occurredAt: new Date().toISOString(),
        data: {
            magnusUserId: change._meta.magnus.userId,
            contractId: change.contract,
            fromStatus: change.from,
            toStatus: change.to,
        },
        _meta: {
            magnusUser: change._meta.magnus.name,
            magnusUsername: change._meta.magnus.username,
            ixcStatus: change._meta.contract.status_internet,
            source: 'status-change.producer'
        }
    }

    const routingKey = `contract.${payload.data.contractId}.status`;
    await channelWrapper.publish(
        EXCHANGES.STATUS_CHANGED,
        routingKey,
        { ...payload, attempt: 1 },
        {
            persistent: true,
            messageId: payload.id,
            headers: { 'x-retries': 0 },
        }
    );
}