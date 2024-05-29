const path = require("path");
const Queue = require("bull");
const redisConfig = require(path.resolve("src/config/redis"))
const { bullQueues } = require(path.resolve("src/lib/Queue"));
const { createBullBoard } = require("@bull-board/api");
const { BullAdapter } = require("@bull-board/api/bullAdapter");
const { ExpressAdapter } = require("@bull-board/express");

const serverAdapter = new ExpressAdapter();
serverAdapter.setBasePath(process.env.BULL_DASHBOARD_ROUTE); // Setando onde vai ser o caminho

const queues = bullQueues // Utilizando as filas passadas, usa REDIS_OPTIONS para gerá-las.
.map((qs) => new Queue(qs, {redis: redisConfig}))
.map((q) => new BullAdapter(q));

const { addQueue, removeQueue, setQueues, replaceQueues } = createBullBoard({
    queues,
    serverAdapter: serverAdapter,
})

module.exports = {
    serverAdapter
}