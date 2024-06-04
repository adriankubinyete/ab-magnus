const path = require("path");
const express = require('express');
const Queue = require(path.resolve("src/lib/Queue"));
const { generateLogger } = require(path.resolve("src/util/logging"));

let router = express.Router();
let LOG_NAME = ""
let LOG_LOCATION = "logs/app"
let LOG_LEVEL = 10
let LOG_FILE_LEVEL = 10
let LOG_FILE_ROTATE = "30d"

router
    .post('/find', async function(req, res){
        const log = generateLogger(req.logPrefix, path.resolve(LOG_LOCATION), LOG_LEVEL, LOG_FILE_LEVEL, LOG_FILE_ROTATE)

        Queue.add('SearchContracts', req.body, {priority: 1})

        res.status(200).json({'teste': 'teste'});
    })
    
    .post('/find/obliterate', async function(req, res){
        const log = generateLogger(req.logPrefix, path.resolve(LOG_LOCATION), LOG_LEVEL, LOG_FILE_LEVEL, LOG_FILE_ROTATE)

        Queue.add('SearchContracts', req.body, {priority: 1})

        res.status(200).json({'teste': 'teste'});
    })
 
module.exports = router;