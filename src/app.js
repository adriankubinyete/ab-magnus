require("dotenv").config();
const path = require("path");
const { Logger } = require( path.resolve('src/util/logging') );
// Bull
const { mqList } = require( path.resolve('src/bull/queues') )
// Express
const ROUTES = require(path.resolve('src/express/routing'))
const { setLogPrefix } = require(path.resolve('src/express/middlewares'))
const express = require('express');

// Preparando terreno
const log = new Logger("MAIN_APP", false).useEnvConfig().create()

// Iniciando o Express e suas rotas.
const app = express();
app.use('/', setLogPrefix, ROUTES)

log.info('//-!@!-@!@-!@!-@!@-!@!-@!@-!@!-// INICIANDO EXPRESS //-!@!-@!@-!@!-@!@-!@!-@!@-!@!-//')
log.info(`
Magnusbilling URL     : ${process.env.MAGNUSBILLING_PROTOCOL}://${process.env.MAGNUSBILLING_HOST}:${process.env.MAGNUSBILLING_PORT}/mbilling
MagnusBilling API_KEY : ${process.env.MAGNUSBILLING_API_KEY}
MagnusBilling API_SCT : ${process.env.MAGNUSBILLING_API_SECRET}`)

// ---------------------------------------------------------------------------------------------------

// (CRON) Configurações do heartbeat para atualizar a listagem de contratos.
TEN_SECONDS  = '*/10 * * * * *';  // :XX:1
HALF_MINUTE  = '*/30 * * * * *';  // :XX:3
ONE_MINUTE   = '0 * * * * *';     // :X1
TEN_MINUTES  = '*/10 * * * *';    // :10
FIVE_MINUTES = '*/5 * * * *';     // :X5
HOURLY = '5 */1 * * *';           // X:05
const HEARTBEAT = ONE_MINUTE

// O centro de tudo: é aqui que é setado a job pra inicializar a pesquisa no Magnus, e do magnus, ele joga pra
// job de pesquisa no IXC

if (JSON.parse(process.env.PAUSE_PRIMARY_JOB)) {
    console.log('adding job')
    mqList.add({}, {repeat: {cron: HEARTBEAT}})
}

app.listen(process.env.EXPRESS_PORT, () => {
    console.log(`Server running on http://localhost:${process.env.EXPRESS_PORT}`.yellow)
    console.info(`Bull Dashboard: http://localhost:${process.env.EXPRESS_PORT}${process.env.BULL_DASHBOARD_ROUTE}`.yellow)
})

/* SOURCES

//# Redis
https://redis.io/docs/latest/operate/oss_and_stack/install/install-redis/
https://redis.io/docs/latest/operate/oss_and_stack/install/install-redis/install-redis-on-windows/ (dev environment)
https://redis.io/docs/latest/operate/oss_and_stack/install/install-redis/install-redis-on-linux/ (prod environment, docker)

//# Bull
https://www.npmjs.com/package/bull
https://www.npmjs.com/package/@bull-board/api
https://www.npmjs.com/package/@bull-board/express
https://www.youtube.com/watch?v=FFrPE0vr4Dw
https://www.youtube.com/watch?v=GOISMrNzYwQ
https://www.youtube.com/watch?v=9jZrSLvJHqA

*/
