import 'dotenv/config';
import { initStatusChangeProducer } from "./producers/status-change.producer.js";
import { startStatusUpdaterConsumer } from "./consumers/status-updater.consumer.js";
import { startPolling } from "./schedulers/status-sync.scheduler.js";
import { initStatusNotifierProducer } from './producers/status-notifier.producer.js';
import { startStatusNotifierConsumer } from './consumers/status-notifier.consumer.js';
import { startHttpServer } from './http-server.js';

const args = process.argv.slice(2);

const hasProduce = args.includes('--producer');
const consumeIndex = args.indexOf('--consumer');
const hasHttp = args.includes('--http');

let consumeMode = null; // 'all' | 'sync' | 'notify'

if (consumeIndex !== -1) {
  const next = args[consumeIndex + 1];

  if (!next || next.startsWith('--')) {
    consumeMode = 'all';
  } else if (next === 'sync' || next === 'notify') {
    consumeMode = next;
  } else {
    console.error(`❌ Invalid consume mode: ${next}`);
    process.exit(1);
  }
}

async function bootstrap() {
  if (hasProduce) {
    console.log('▶ starting producer (scheduler)');
    await initStatusChangeProducer();
    startPolling();
  }

  if (consumeMode) {
    if (consumeMode === 'all' || consumeMode === 'sync') {
      console.log('> starting sync consumer');
      await initStatusNotifierProducer();
      startStatusUpdaterConsumer();
    }

    if (consumeMode === 'all' || consumeMode === 'notify') {
      console.log('> starting notify consumer');
      startStatusNotifierConsumer();
    }
  }

  if (hasHttp) {
    startHttpServer();
  }

  if (!hasProduce && !consumeMode) {
    console.warn('> [!] nothing to start (use --producer, --consumer, or --http)');
  }
}

bootstrap().catch(err => {
  console.error('> [!] fatal error', err);
  process.exit(1);
});