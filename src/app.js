import { initProducer } from "./producers/status-change.producer";
import { startStatusUpdater } from "./consumers/status-updater.consumer";
import { startPolling } from "./schedulers/poll-ixc.scheduler";

async function bootstrap() {
    await initProducer();
    startStatusUpdater(); // can run multiple processes/workers
    startPolling();
    console.log('App started.');
}

bootstrap().catch(console.error);