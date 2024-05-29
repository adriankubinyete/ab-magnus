const path = require("path");
const express = require('express');
const { generateLogger } = require( path.resolve("src/util/logging") )
let router = express.Router();

let LOG_NAME = ""
let LOG_LOCATION = "logs/app"
let LOG_LEVEL = 10
let LOG_FILE_LEVEL = 10
let LOG_FILE_ROTATE = "30d"

router

    .get('/notify', async function(req, res){
        const log = generateLogger(req.logPrefix, path.resolve(LOG_LOCATION), LOG_LEVEL, LOG_FILE_LEVEL, LOG_FILE_ROTATE)
        log.info('teste notify')
        res.status(200).json({status: 'test'});
    })

 
module.exports = router;