const path = require("path");
const Bull = require("bull");
const REDIS = require(path.resolve("src/config/redis"))

let bullQueues = [];

function createBullQueue(queueName, queueParameters = {}) {
    bullQueues.push(queueName);
    if (!queueParameters.redis) { queueParameters.redis = REDIS }
    let bq = Bull (queueName, queueParameters);
    return bq;
}

let mqList = createBullQueue("magnus:list"); // Pega todos usuários do Magnus, e envia pra fila de pesquisa no IXC
// :
// V
let absqFind = createBullQueue("abs:find"); // Pra cada usuário repassado que tem contrato, decide o que fazer com ele: block, unblock, disable, enable
// :
// V
// Criando 4 filas à pedido do Rafael. Eu mesmo faria uma fila e separaria por ações dentro de uma fila só.
let mqBlock = createBullQueue("magnus:block")     // 1 -> 4
let mqUnblock = createBullQueue("magnus:unblock") // 2,3,4 -> 1
let mqDisable = createBullQueue("magnus:disable") // 1,2,3,4 -> 0
let mqEnable = createBullQueue("magnus:enable")   // 0 -> 1
// :
// V
let dqNotify = createBullQueue("discord:notify") // Notifica uma ação no discord. Vinculado às ações (block, unblock, disable, enable)

function registerProcessors() {
    // Feito através de injeção de dependência (Dependency Injection):
    // As filas são criadas no queues.js.
    // Então, são passadas como argumentos para as funções que registram os processadores.
    // Dentro das funções de registro de processadores, as filas injetadas são utilizadas conforme necessário.
    require(path.resolve("src/bull/processors/abs"))(absqFind, mqBlock, mqUnblock, mqDisable, mqEnable, dqNotify);
    require(path.resolve("src/bull/processors/magnus"))(mqList, absqFind, mqBlock, mqUnblock, mqDisable, mqEnable, dqNotify); 
    require(path.resolve("src/bull/processors/discord"))(dqNotify); 
}

// registerProcessors();

module.exports = {
    bullQueues,
    mqList,
    absqFind,
    mqBlock,
    mqUnblock,
    mqDisable,
    mqEnable,
    dqNotify
}
