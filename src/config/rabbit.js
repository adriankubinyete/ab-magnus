export const RABBIT_URL = process.env.RABBITMQ_URL || "amqp://localhost:5672";
export const PREFIX = `${process.env.RABBITMQ_PREFIX || 'abm'}.`;

export const EXCHANGES = {
    STATUS_CHANGED: `${PREFIX}status.changed`,
    DLX: `${PREFIX}dlx`,
};

export const QUEUES = {
    STATUS_UPDATE: `${PREFIX}status.update`,
    STATUS_UPDATE_RETRY: `${PREFIX}status.update.retry`,
    STATUS_UPDATE_DLQ: `${PREFIX}status.update.dlq`,
}
