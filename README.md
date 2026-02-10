## Usage

```bash
pnpm start [--consumer] [--producer]
```

## Flags:

- --producer<br>Periodically polls IxcSoft and MagnusBilling, and publishes status change events to RabbitMQ.

- --consumer<br>Consumes events from RabbitMQ: synchronizes data and sends notifications

- --http<br>Opens an http server to allow for manual triggering of the sync event, which sends changes to RabbitMQ the queue. _Still requires consumers to process the queues._

## Examples

```bash
# Only run the event-generation part
pnpm start --producer

# Only run the event-processing part
pnpm start --consumer

# Generate and process events
pnpm start --producer --consumer
```

## Notes

If you plan on running multiple hosts, make sure the RABBITMQ_PREFIX parameter matches on both environment files, otherwise you might generate to a queue, but consume from other.



