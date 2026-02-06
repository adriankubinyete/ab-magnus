export const RABBIT_URL = process.env.RABBITMQ_URL || "amqp://localhost:5672";
export const PREFIX = process.env.RABBITMQ_PREFIX + '.' || 'abm.';

export const EXCHANGES = {
    STATUS_CHANGED: `${PREFIX}status.changed`,
    DLX: `${PREFIX}dlx`,
};

export const QUEUES = {
    STATUS_UPDATE: `${PREFIX}magnus.status.update`,
    STATUS_UPDATE_DLQ: `${PREFIX}magnus.status.update.dql`,
}
