const path = require("path");
const { generateLogger } = require( path.resolve("src/util/logging") )
const { getMagnusBillingClient } = require( path.resolve("src/util/Utils") )

let LOG_NAME = "p:DisableClient"
let LOG_LOCATION = "logs/app"
let LOG_LEVEL = 10
let LOG_FILE_LEVEL = 10
let LOG_FILE_ROTATE = "30d"

module.exports = {
    key: 'DisableClient',
    async handle(job, done, Queue) {
        const JOB_NAME = `${LOG_NAME}:${job.id}`
        const log = generateLogger(JOB_NAME, path.resolve(LOG_LOCATION), LOG_LEVEL, LOG_FILE_LEVEL, LOG_FILE_ROTATE);
        let _DRY = true

        let mb = getMagnusBillingClient();
        
        async function mbGetClientIdFromUsername(username) {
            log.unit(`Getid username: ${username}`)
            let ret = await mb.clients.users.getid({
                filtro: [
                    ['username', '=', username]
                ]
            })

            if (ret) { 
                return parseInt(ret) 
            } else { 
                throw new Error(`Erro ao obter ID do cliente ${username}`)
            }

        }

        async function mbEditUserStatus(userId, newStatus) {
            if (_DRY) {
                log.debug(`DRY: EditUserStatus`)
                return true
            }
            
            let ret = await mb.clients.users.edit({
                id: userId,
                active: newStatus
            })

            if (ret && ret.success == true) {
                log.trace(`EditUserStatus return: ${JSON.stringify(ret)}`)
                return true
            } else { 
                log.error("Alguma coisa aconteceu, não foi possível editar o status do usuário")
                return false
            }

        }

        let counter = 0;
        for (const client of job.data) {
            counter++;
            console.log(`Counter: ${counter} | ${JSON.stringify(client)}`);

            try {
                let magnusId = await mbGetClientIdFromUsername(client.usuario)
                if (mbEditUserStatus(magnusId, client.statusNovo)) {
                    log.info(`Sucesso! Usuário ${client.nome} completado. (Novo status: ${client.statusNovo})`)
                }
            } catch (error) {
                throw error;
            }

            Queue.add('DiscordMessage', client)
            // mandar msg no discord
        }

        job.progress(100);
        if(job.progress()>=100) {
            done(null, {})
        }
    }
}
