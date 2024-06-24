require("dotenv").config();
const path = require("path");
const Queue = require(path.resolve("src/lib/Queue"));
const ROUTES = require(path.resolve('src/express/routing'));
const { setLogPrefix } = require(path.resolve('src/express/middlewares'));
const express = require('express');

// Iniciando o Express e suas rotas.
const app = express();
app.use('/', setLogPrefix, ROUTES)

if (!(process.env.PAUSE_PRIMARY_JOB === 'true')) {
    Queue.add('ListMagnusClients', {originator: "Cron Main_Job", DRY: true}, {repeat: {cron: process.env.PRIMARY_JOB_CRON}})
}

app.listen(process.env.EXPRESS_PORT, () => {
    console.log(`Server running on http://localhost:${process.env.EXPRESS_PORT}`)
    console.info(`Bull Dashboard: http://localhost:${process.env.EXPRESS_PORT}${process.env.BULL_DASHBOARD_ROUTE}`)
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
