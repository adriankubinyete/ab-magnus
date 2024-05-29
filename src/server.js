require("dotenv").config();
const path = require("path");
const colors = require("colors");
const ROUTES = require(path.resolve('src/express/routing'));
const { setLogPrefix } = require(path.resolve('src/express/middlewares'));
const express = require('express');

// Iniciando o Express e suas rotas.
const app = express();
app.use('/', setLogPrefix, ROUTES)

if (!(process.env.PAUSE_PRIMARY_JOB === 'true')) {
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
