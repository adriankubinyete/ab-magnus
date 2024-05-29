const path = require("path");
const Bull = require("bull");
const redisConfig = require(path.resolve("src/config/redis"));
const jobs = require(path.resolve("src/jobs"));

const queues = Object.values(jobs).map(job => ({
    bull: new Bull(job.key, redisConfig),
    name: job.key,
    handle: job.handle
}))

module.exports = {
    getQueueNames() {
        return this.queues.map(queue => queue.name);
    },
    queues,
    add(name, data) {
        const queue = this.queues.find(queue => queue.name === name);
        return queue.bull.add(data);
    },
    process() {
        return this.queues.forEach(queue => {
            queue.bull.process(queue.handle)

            queue.bull.on('failed', (job, err) => {
                console.log('Job failed', job.name, job.data);
                console.log(err);
            })
        })
    }
}




// function createBullQueue(mKey, queueName, queueParameters = {}) {
//     bullQueues.push(queueName);
//     if (!queueParameters.redis) { queueParameters.redis = redisConfig }
//     let bq = Bull (queueName, queueParameters);
//     bq.on('failed', (job, err) => {
//         console.log('Job failed:', job.name, job.data);
//     });

//     module.exports[`${mKey}`] = bq

//     return bq;
// }

// createBullQueue("mqList", "magnus:list"); // Pega todos usuários do Magnus, e envia pra fila de pesquisa no IXC
// createBullQueue("absqFind", "abs:find"); // Pra cada usuário repassado que tem contrato, decide o que fazer com ele: 
// createBullQueue("mqBlock", "magnus:block")     // 1 -> 4
// createBullQueue("mqUnblock", "magnus:unblock") // 2,3,4 -> 1
// createBullQueue("mqDisable", "magnus:disable") // 1,2,3,4 -> 0
// createBullQueue("mqEnable", "magnus:enable")   // 0 -> 1
// createBullQueue("dqNotify", "discord:notify") // Notifica uma ação no discord. Vinculado às ações (block, unblock, disable, enable)

// console.log(module.exports)

// // function registerProcessors() {
// //     // Feito através de injeção de dependência (Dependency Injection):
// //     // As filas são criadas no queues.js.
// //     // Então, são passadas como argumentos para as funções que registram os processadores.
// //     // Dentro das funções de registro de processadores, as filas injetadas são utilizadas conforme necessário.
// //     require(path.resolve("src/bull/processors/abs"))(absqFind, mqBlock, mqUnblock, mqDisable, mqEnable, dqNotify);
// //     require(path.resolve("src/bull/processors/magnus"))(mqList, absqFind, mqBlock, mqUnblock, mqDisable, mqEnable, dqNotify); 
// //     require(path.resolve("src/bull/processors/discord"))(dqNotify); 
// // }

// mqList.on('failed', (job) => {
//     console.log('Job failed:', job.name, job.data);
// });

// // registerProcessors();

// module.exports = {
//     ...module.exports,
//     bullQueues
// }
