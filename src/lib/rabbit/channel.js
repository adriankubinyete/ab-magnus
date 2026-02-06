import { EXCHANGES, QUEUES } from '../config/rabbit.js';

export async function setupTopology(channel) {
    // exchange topic
    await channel.assertExchange(EXCHANGES.STATUS_CHANGED, 'topic', { durable: true });

    // dlx
    await channel.assertExchange(EXCHANGES.DLX, 'direct', { durable: true });

    // main queue with DLQ + retry (ttl)
    await channel.assertQueue(QUEUES.STATUS_UPDATE, {
        durable: true,
        arguments: {
            'x-dead-letter-exchange': EXCHANGES.DLX,
            'x-dead-letter-routing-key': 'retry',
        },
    });

    await channel.bindQueue(QUEUES.STATUS_UPDATE, EXCHANGES.STATUS_CHANGED, 'contract.#');

    // dlq (ttl to reprocess after Nt)
    await channel.assertQueue(QUEUES.STATUS_UPDATE_DLQ, {
        durable: true,
        arguments: { 'x-message-ttl': 300000 }, // 5 min, go back to retry or login
    });
    await channel.bindQueue(QUEUES.STATUS_UPDATE_DLQ, EXCHANGES.DLX, 'retry');
}