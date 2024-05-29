require("dotenv").config();
const path = require("path");
const { bullQueues, mqList, absqFind, mqBlock, mqUnblock, mqDisable, mqEnable, dqNotify } = require(path.resolve("src/lib/Queue"));
const ListMagnusClients = require(path.resolve("src/jobs/ListMagnusClients"));

mqList.process(ListMagnusClients.handle);

mqList.add({ "teste": 'wasd' })
