const express = require('express');
const path = require("path");
const cors = require('cors');
const bodyParser = require('body-parser');
const { default: helmet } = require('helmet');

// Bull dashboard
const { serverAdapter } = require( path.resolve('src/express/routes/bull/dashboard') ); // Bull Dashboard for Express

// Routes
const ABS_QUEUE_ENDPOINT = require(path.resolve('src/express/routes/bull/abs'))
const MAGNUS_QUEUE_ENDPOINT = require(path.resolve('src/express/routes/bull/magnus'))
// const DISCORD_QUEUE_ENDPOINT = require(path.resolve('src/express/routes/bull/discord'))

// console.log('teste')

let router = express.Router();
router
    .use(cors())
    .use(helmet())
    .use(bodyParser.json())      // isso tem que estar em cima!!!!!!!
    
    .get('/', function () { })
    .use('/bull/abs', ABS_QUEUE_ENDPOINT)
    .use('/bull/magnus', MAGNUS_QUEUE_ENDPOINT)
    // .use('/bull/discord', DISCORD_QUEUE_ENDPOINT)
    .use(process.env.BULL_DASHBOARD_ROUTE, serverAdapter.getRouter()) // Bull dashboard

    .use((err, req, res, next) => {
        res.status(500).json({
            status: 'error',
            type: 'Internal Server Error',
            code: 500,
            message: 'Ocorreu um erro durante o processamento da sua solicitação. Por favor, tente novamente mais tarde.'
        });
    })

module.exports = router;
