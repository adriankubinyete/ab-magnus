require("dotenv").config();
const path = require("path");
const { Logger } = require( path.resolve("src/util/logging") );

const Queue = require(path.resolve("src/lib/Queue"));

Queue.process();

/*

Pqp em redis... "[ErrorReply: ERR Protocol error: unauthenticated multibulk length]" pra um erro de autenticação porque eu esqueci de passar "redis: redisConfig", dahora.
https://github.com/redis/node-redis/issues/2286

*/
