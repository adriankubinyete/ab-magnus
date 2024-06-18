const path = require("path");
const express = require('express');
const Queue = require(path.resolve("src/lib/Queue"));
const { Logger } = require( path.resolve("src/util/logging") )
let router = express.Router();

function QueueNotExists(error) {
    return (error instanceof TypeError && error.message.includes("reading 'bull'"))
}

router

    .delete('/obliterate', async function(req, res){
        const log = new Logger(req.logPrefix, false).useEnvConfig().create()
        const { queue, data, config } = req.body;

        queue.forEach(queue => {
            try {
                Queue.obliterate(queue, config);
            } catch (error) {
    
                // Conferindo se o erro foi porque a fila não existe
                if (QueueNotExists(error)) {
                    log.warn(`Não foi possível obliterar a fila "${queue}": fila não existe.`);
                    res.status(404).json(req.body);
                    return;
                }
    
                // Erro genérico, a fila existe mas deu alguma outra coisa.
                throw error;
    
            }
        });

        log.warn(`Queue obliterada: ${queue} ( config: ${JSON.stringify(config)} )`)
        res.status(200).json(req.body);
    })

    .post('/add', async function(req, res){
        const log = new Logger(req.logPrefix, false).useEnvConfig().create()
        const { queue, data, config } = req.body;

        try {
            Queue.add(queue, data, config);
        } catch (error) {
            if (QueueNotExists(error)) {
                log.warn(`Não foi possível adicionar a job pra fila "${queue}": fila não existe.`);
                res.status(404).json(req.body);
                return;
            }
            throw error;
        }

        log.debug(`Job adicionada: q:${queue} c:${JSON.stringify(config)} d:${JSON.stringify(data)}`)
        res.status(200).json(req.body);
    })
 
module.exports = router;