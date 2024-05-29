require("dotenv").config();
const path = require("path");
const Queue = require(path.resolve("src/lib/Queue"));

Queue.process();

Queue.add('ListMagnusClients', { "teste": 'wasd' })
