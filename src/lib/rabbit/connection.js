import amqpConnManager from 'amqp-connection-manager';
import amqp from 'amqplib';
import { RABBIT_URL, EXCHANGES, QUEUES } from '../../config/rabbit.js';

export async function getConnection() {
    console.log('Connecting to RabbitMQ...');
    const connManager = amqpConnManager.connect([RABBIT_URL], { reconnectTimeInSeconds: 5 });

    connManager.on('connect', () => console.log('RabbitMQ Connected.'));
    connManager.on('disconnect', (params) => {
        console.log(
            'RabbitMQ Disconnected.',
            params?.err?.message
        );
    });

    return connManager;
}

export async function setupTopology(channel) {
    // exchange principal (eventos)
    await channel.assertExchange(EXCHANGES.STATUS_CHANGED, 'topic', {
        durable: true,
    });

    // dead-letter exchange
    await channel.assertExchange(EXCHANGES.DLX, 'direct', {
        durable: true,
    });

    // main q
    await channel.assertQueue(QUEUES.STATUS_UPDATE, {
        durable: true,
        arguments: {
            'x-dead-letter-exchange': EXCHANGES.DLX,
            'x-dead-letter-routing-key': 'retry',
        },
    });

    await channel.bindQueue(
        QUEUES.STATUS_UPDATE,
        EXCHANGES.STATUS_CHANGED,
        'contract.#'
    );

    // retry
    await channel.assertQueue(QUEUES.STATUS_UPDATE_RETRY, {
        durable: true,
        arguments: {
            'x-message-ttl': 5 * 60 * 1000, // 5min
            'x-dead-letter-exchange': EXCHANGES.STATUS_CHANGED,
            'x-dead-letter-routing-key': 'contract.retry',
        },
    });

    await channel.bindQueue(
        QUEUES.STATUS_UPDATE_RETRY,
        EXCHANGES.DLX,
        'retry'
    );

    await channel.assertQueue(QUEUES.STATUS_UPDATE_DLQ, {
        durable: true,
    });

    await channel.bindQueue(
        QUEUES.STATUS_UPDATE_DLQ,
        EXCHANGES.DLX,
        'dead'
    );

    await channel.assertExchange(EXCHANGES.STATUS_SYNCED, "topic", {
        durable: true,
    });

    await channel.assertQueue(QUEUES.STATUS_NOTIFY, {
        durable: true,
    });

    await channel.bindQueue(
        QUEUES.STATUS_NOTIFY,
        EXCHANGES.STATUS_SYNCED,
        `${EXCHANGES.STATUS_SYNCED}.*`
    );

}
