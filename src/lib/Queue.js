const path = require("path");
const Bull = require("bull");
const redisConfig = require(path.resolve("src/config/redis"));
const jobs = require(path.resolve("src/jobs"));

const queues = Object.values(jobs).map(job => ({
    bull: new Bull(job.key, { redis: redisConfig, ...(job.config || {}) }),
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
            queue.bull.process(async (job, done) => {
                try {
                    await queue.handle(job, done, this); // Passa 'queues' como segundo argumento
                } catch (error) {
                    done(error); // pro bull nao explodir meu worker quando der erro dentro do queue.handle
                }
            });

            queue.bull.on('failed', (job, err) => {
                console.log('Job failed', job.name, job.data);
                console.log(err);
            })

        })
    }
}
