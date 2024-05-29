const path = require("path");
const express = require('express');
const { generateLogger } = require( path.resolve("src/util/logging") )
let router = express.Router();
// Bull Queue
const { mqList } = require(path.resolve("src/bull/queues"));


let LOG_NAME = ""
let LOG_LOCATION = "logs/app"
let LOG_LEVEL = 10
let LOG_FILE_LEVEL = 10
let LOG_FILE_ROTATE = "30d"

router

    // Similar ao FORCEUPDATE
    .post('/list', async function(req, res){
        const log = generateLogger(req.logPrefix, path.resolve(LOG_LOCATION), LOG_LEVEL, LOG_FILE_LEVEL, LOG_FILE_ROTATE)
        mqList.add({}, {priority: 1})
        res.status(200).json({status: 'test'});
    })

    .get('/block', async function(req, res){
        const log = generateLogger(req.logPrefix, path.resolve(LOG_LOCATION), LOG_LEVEL, LOG_FILE_LEVEL, LOG_FILE_ROTATE)
        log.info('teste block')
        res.status(200).json({status: 'test'});
    })

    .get('/unblock', async function(req, res){
        const log = generateLogger(req.logPrefix, path.resolve(LOG_LOCATION), LOG_LEVEL, LOG_FILE_LEVEL, LOG_FILE_ROTATE)
        log.info('teste unblock')
        res.status(200).json({status: 'test'});
    })
    
    .get('/disable', async function(req, res){
        const log = generateLogger(req.logPrefix, path.resolve(LOG_LOCATION), LOG_LEVEL, LOG_FILE_LEVEL, LOG_FILE_ROTATE)
        log.info('teste disable')
        res.status(200).json({status: 'test'});
    })

    .get('/enable', async function(req, res){
        const log = generateLogger(req.logPrefix, path.resolve(LOG_LOCATION), LOG_LEVEL, LOG_FILE_LEVEL, LOG_FILE_ROTATE)
        log.info('teste enable')
        res.status(200).json({status: 'test'});
    })

 
module.exports = router;