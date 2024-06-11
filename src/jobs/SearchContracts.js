const path = require("path");
const { generateLogger } = require(path.resolve("src/util/logging"))
const { sha256, sendRequestABS } = require(path.resolve("src/util/Utils"))

class ClientProcessor {
    constructor(log) {

        // Preparando o que será retornado ao processar os clientes.
        this.output = {
            block: {},
            unblock: {},
            disable: {},
            enable: {},
            debug: {},
            error: {},
        };

        // O que cada ID significa no Magnus.
        this.STATUS_ACTIVE = [1];
        this.STATUS_INACTIVE = [0];
        this.STATUS_BLOCK = [4, 3, 2];
        
        // ABS
        this.ABS_URL = `${process.env.AUTOBLOCKERSERVER_PROTOCOL}://${process.env.AUTOBLOCKERSERVER_HOST}:${process.env.AUTOBLOCKERSERVER_PORT}`
        this.ABS_CHECK_CONTRACT_ENDPOINT = `contract/check`
        this.ABS_SALT = process.env.AUTOBLOCKERSERVER_SALT

        // Converte status do IXC pra status do Magnus
        this.IXC_TO_MAGNUS = {
            'CA': this.STATUS_BLOCK,
            'CM': this.STATUS_BLOCK,
            'FA': this.STATUS_BLOCK,
            'AA': this.STATUS_BLOCK,
            'D': this.STATUS_INACTIVE,
            'A': this.STATUS_ACTIVE
        };

        this.log = log;

    }

    async findClientViaContractInABS(contrato) {
        let REQUEST_METHOD = 'POST';
        let REQUEST_URL = `${this.IXC_ABS_URL}/${this.IXC_ABS_CHECK_CONTRACT_ENDPOINT}`;
        let REQUEST_DATA = { contract: sha256(`${this.IXC_ABS_SALT}${contract}`, { digest: 'hex' }) }
        let REQUEST = {
            method: REQUEST_METHOD,
            url: REQUEST_URL,
            data: REQUEST_DATA
        }
        let r = await sendRequestABS(REQUEST);
        this.log.unit(`Response from ABS: ${JSON.stringify(r)}`)
        return r;
    }

    async getAction(oldStatus, newStatus) {
        // Não curti isso, ver depois se tem como otimizar (essas funções declaradas aqui dentro)
        function isActive(cs) { return this.STATUS_ACTIVE.includes(cs) };
        function isInactive(cs) { return this.STATUS_INACTIVE.includes(cs) };
        function isBlocked(cs) { return this.STATUS_BLOCK.includes(cs) };

        oldStatus = parseInt(oldStatus);
        newStatus = parseInt(newStatus);
        
        let BLOQUEIO    = 'block'   // 1       -> 4, bloqueio
        let DESBLOQUEIO = 'unblock' // 2,3,4   -> 1, desbloqueio
        let ATIVACAO    = 'enable'  // 0       -> 1, ativacao
        let DESATIVACAO = 'disable' // 1,2,3,4 -> 0, desativação
        let action      = null;
        let logMessage  = null;
        logPrefix = logPrefix || contrato || 'prefix_not_set';

        // é aqui que eu vou ter que decidir o que é retornado... preciso reestruturar esse getAction
        if (isBlocked(oldStatus)) {
            if (isInactive(newStatus)) { action = DESATIVACAO };
            if (isActive(newStatus)) { action = DESBLOQUEIO } ;
        } else if (isInactive(oldStatus)) {
            if (isBlocked(newStatus)) { logMessage = '?????????' }; // ué
            if (isActive(newStatus)) { action = ATIVACAO };
        } else if (isActive(oldStatus)) {
            if (isBlocked(newStatus)) { action = BLOQUEIO };
            if (isInactive(newStatus)) { action = DESATIVACAO };
        } else { logMessage = 'Direct error' }

        if (action) { logMessage = action }

        log.debug(`${logPrefix}: ${action}`)
        
        return action;
    }

    async processClient(cliente, jobPayloads) {
        this.log.unit(cliente);
        const statusMagnus = parseInt(cliente.status);
        const nome = cliente.nome;
        const contrato = cliente.contrato
        const usuario = cliente.usuario
        let err_msg = null;

        const ixc = await this.findClientViaContractInABS(contrato);
        if (!ixc) {
            err_msg = `Não foi retornado nenhum contrato na pesquisa do contrato "${contrato}"`
            this.log.error(err_msg);
            JOBS_TO_SEND.errors.push({error: err_msg, ...cliente})
        }

        const newMagnusStatus = this.IXC_STATUS_MAPPING[ixc.contract.status_contrato];
        if (newMagnusStatus.includes(statusMagnus)) {
            this.log.trace("Status atual e novo são iguais. Ignorando.");
            jobPayloads.nochange.push({ "cliente": nome, "usuario": usuario, action: "debug" });
            return;
        }

        const action = this.getAction(statusMagnus, newMagnusStatus[0]);
        if (!action) {
            this.log.error(`FAIL! // Nome: ${nome} // ${statusMagnus} -> ${newMagnusStatus[0]}`);
            return;
        }

        jobPayloads[action].push({
            nome: nome,
            usuario: usuario,
            statusAtual: statusMagnus,
            statusNovo: newMagnusStatus[0],
            action: action
        });
    }
}
















let ABS_LOG_NAME = "p:SearchContract"
let ABS_LOG_LOCATION = "logs/app"
let ABS_LOG_LEVEL = 10
let ABS_LOG_FILE_LEVEL = 10
let ABS_LOG_FILE_ROTATE = "30d"

function keyShouldBeIgnored(key) {
    let KEYS_TO_IGNORE = ['originator']
    if (KEYS_TO_IGNORE.includes(key)) { 
        return true;
    };
    return false;
}

module.exports = {
    key: 'SearchContracts',
    async handle(job, done, Queue) {
        job.data._JOB_IID = `${ABS_LOG_NAME}:${job.id}`;
        const log = generateLogger(job.data._JOB_IID, path.resolve(ABS_LOG_LOCATION), ABS_LOG_LEVEL, ABS_LOG_FILE_LEVEL, ABS_LOG_FILE_ROTATE);
        log.debug("Starting job...");

        // CONSTANTES / CONFIGURAÇÃO
        

        let JOBS_TO_SEND = {
            disable: [],
            enable: [],
            block: [],
            unblock: [],
            errors: [],
        }

        async function processClient(usuario, cliente, jobPayloads) {

            log.unit(cliente)
            let statusMagnus = parseInt(cliente.status);
            let nome = cliente.nome;
            let contrato = cliente.contrato;
            let newMagnusStatus;

            function reportClientError(msg) {
                log.error(msg);
                JOBS_TO_SEND.errors.push({"cliente": nome, "usuario": usuario, "action": "error", "erro": msg})
                return null;
            }

            // Encaminha a requisição pro ABS.
            async function searchClientInIxc(contract) {
                
            };

            // Com base no status atual, e novo, retorna "block, unblock, enable, disable"
            function getAction(atual, novo, logPrefix = null) {

                
            }

            let ixc = await searchClientInIxc(contrato);
            if (!ixc) { return reportClientError(`Não foi retornado nenhum contrato na pesquisa do contrato "${contrato}"`) };

            newMagnusStatus = IXC_STATUS_MAPPING[ixc.contract.status_contrato];
            if (newMagnusStatus.includes(statusMagnus)) { 
                log.trace("Status atual e novo são iguais. Ignorando.");
                jobsToSend.nochange.push({"cliente": nome, "usuario": usuario, action: "debug"})
                return; 
            };

            let action = getAction(statusMagnus, newMagnusStatus[0]);
            if (!action) { log.error(`FAIL! //  Nome: ${nome} // ${statusMagnus} -> ${newMagnusStatus[0]}`); return; };

            jobPayloads[action].push({ 
                nome: nome, 
                usuario: usuario, 
                statusAtual: statusMagnus, 
                statusNovo: newMagnusStatus[0],
                action: action
            })

        }

        // Processando cada cliente recebido
        // Estou assumindo que a estrutura que chega até mim é:

        // job.data = {
        //     tags: {originator: ""},
        //     users: {
        //         "usuario": {...dadosDoUsuario}
        //     }
        // }

        // Pra cada usuário, só acrescentar outro no final.
        for (const [key, data] of Object.entries(job.data.users)) {
            if (!keyShouldBeIgnored(key)) {
                await processClient(key, data, jobsToSend)
            }
        }

        log.info(`Processamento finalizado.`)

        // Iterando sobre os 
        for (const [key, data] of Object.entries(jobsToSend)) {
            let jobList = jobsToSend[key] // terminar isso amanha. loopar no objeto jobsToSend pra simplificar o envio, sem ter q ficar mapeando if x = desbloqueio then job.add.desbloqueio else x = bloqueio then job.add.bloqueio etc...
        }


        log.unit(`Jobs to send: `)
        console.log(JOBS_TO_SEND)


        

        // log.info(`Desativações: ${jobsToSend.disable.length}`); job.log(`Desativações: ${jobsToSend.disable.length}`);
        // if (jobsToSend.disable.length > 0) {
        //     log.trace(JSON.stringify(jobsToSend.disable))
        // };

        // log.info(`Ativações: ${jobsToSend.enable.length}`); job.log(`Ativações: ${jobsToSend.enable.length}`);
        // if (jobsToSend.enable.length > 0) {
        //     log.trace(JSON.stringify(jobsToSend.enable)); 
        //     Queue.add('EnableClient', jobsToSend.enable);
        // };

        // log.info(`Bloqueios: ${jobsToSend.block.length}`); job.log(`Bloqueios: ${jobsToSend.block.length}`);
        // if (jobsToSend.block.length > 0) {
        //     log.trace(JSON.stringify(jobsToSend.block)); 
        //     Queue.add('BlockClient', jobsToSend.block);
        // };
        
        // log.info(`Desbloqueios: ${jobsToSend.unblock.length}`); job.log(`Desbloqueios: ${jobsToSend.unblock.length}`);
        // if (jobsToSend.unblock.length > 0) {
        //     log.trace(JSON.stringify(jobsToSend.unblock))
        // };

        // log.info(`Sem alterações: ${NO_CHANGE.length}`); job.log(`Sem alterações: ${NO_CHANGE.length}`);
        // if (NO_CHANGE.length > 0) {
        //     log.trace(JSON.stringify(NO_CHANGE))}

        // log.info(`Erros: ${ERRORS.length}`); job.log(`Erros: ${ERRORS.length}`);
        // if (ERRORS.length > 0) {log.error(JSON.stringify(ERRORS))
        // };

        done(null, {});
    }
}
