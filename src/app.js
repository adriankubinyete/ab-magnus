import 'dotenv/config';
import { initStatusChangeProducer } from "./producers/status-change.producer.js";
import { startStatusUpdaterConsumer } from "./consumers/status-updater.consumer.js";
import { startPolling } from "./schedulers/status-sync.scheduler.js";

async function bootstrap() {
    await initStatusChangeProducer();
    startStatusUpdaterConsumer(); // can run multiple processes/workers
    startPolling();
    console.log('App started.');
}

bootstrap().catch(console.error);