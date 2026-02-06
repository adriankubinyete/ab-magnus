import amqpConnManager from 'amqp-connection-manager';
import amqp from 'amqplib';
import { RABBIT_URL } from '../../config/rabbit.js';

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