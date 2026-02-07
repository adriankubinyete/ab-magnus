import 'dotenv/config';
import { initProducer } from "./producers/status-change.producer.js";
import { startStatusUpdater } from "./consumers/status-updater.consumer.js";
import { startPolling } from "./schedulers/status-sync.scheduler.js";

async function bootstrap() {
    await initProducer();
    startStatusUpdater(); // can run multiple processes/workers
    startPolling();
    console.log('App started.');
}

bootstrap().catch(console.error);