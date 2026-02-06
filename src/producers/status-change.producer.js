import { getConnection, EXCHANGES, setupTopology } from "../config/rabbit";

let channelWrapper = null;

export async function initProducer() {
    const conn = await getConnection();

    channelWrapper = conn.createChannel({
        json: true,
        setup: async channel => {
            await setupTopology(channel); // make exchanges/queues
        },
    });
}

export async function publishStatusChange(change) {
    if (!channelWrapper) throw new Error('Producer not initialized');

    const { contractId, newStatus, changedAt } = change;

    await channelWrapper.sendToQueue(
        '', // to exchange
        EXCHANGES.STATUS_CHANGES,
        { contractId, newStatus, changedAt, attempt: 1 },
        {
            persistent: true,
            messageId: `${contractId}-${newStatus}-${changedAt}`, // idempotency
            headers: { 'x-retries': 0 },
            routingKey: `contract.${contractId}.status`,
        }
    );
}