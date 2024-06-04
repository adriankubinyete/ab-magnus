const path = require("path");
const Bull = require("bull");
const redisConfig = require(path.resolve("src/config/redis"));
const jobs = require(path.resolve("src/jobs"));

const queues = Object.values(jobs).map(job => ({
    bull: new Bull(job.key, {redis: redisConfig}),
    name: job.key,
    handle: job.handle
}))

module.exports = {
    queues,
    getQueueNames() {
        return this.queues.map(queue => queue.name);
    },
    add(name, data, config = null) {
        const queue = this.queues.find(queue => queue.name === name);
        return queue.bull.add(data, config);
    },
    obliterate(name, config = null) {
        const queue = this.queues.find(queue => queue.name === name);
        return queue.bull.obliterate(config);
    },
    process() {
        return this.queues.forEach(queue => {
            queue.bull.process(async (job) => {
                await queue.handle(job, this); // Passa 'queues' como segundo argumento
            });
            // queue.bull.process(queue.handle)

            queue.bull.on('failed', (job, err) => {
                console.log('Job failed', job.name, job.data);
                console.log(err);
            })

        })
    }
}
