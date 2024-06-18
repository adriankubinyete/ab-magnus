const express = require('express');
const path = require("path");
const cors = require('cors');
const bodyParser = require('body-parser');
const { default: helmet } = require('helmet');

// Bull dashboard
const { serverAdapter } = require( path.resolve('src/express/routes/bull/dashboard') ); // Bull Dashboard for Express

// Routes
const QUEUE_MANAGER_ENDPOINT = require(path.resolve('src/express/routes/bull/queuemanager'));

let router = express.Router();
router
    .use(cors())
    .use(helmet())
    .use(bodyParser.json())      // isso tem que estar em cima!!!!!!!
    
    .get('/', function () { })

    .use('/bull/queues', QUEUE_MANAGER_ENDPOINT)
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
