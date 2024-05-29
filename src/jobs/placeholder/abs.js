const path = require("path");
const { generateLogger } = require(path.resolve("src/util/logging"))
const { sha256 } = require(path.resolve("src/util/Utils"))
const axios = require("axios");

console.log(process.env)
console.log('ABS DIRNAME:' + __dirname)

let ABS_LOG_NAME = "proc:abs"
let ABS_LOG_LOCATION = "logs/app"
let ABS_LOG_LEVEL = 10
let ABS_LOG_FILE_LEVEL = 10
let ABS_LOG_FILE_ROTATE = "30d"

let ABSQFIND_CONC = 1;
let AUTOBLOCKERSERVER_URL = `${process.env.AUTOBLOCKERSERVER_PROTOCOL}://${process.env.AUTOBLOCKERSERVER_HOST}:${process.env.AUTOBLOCKERSERVER_PORT}`

const log = generateLogger(ABS_LOG_NAME, path.resolve(ABS_LOG_LOCATION), ABS_LOG_LEVEL, ABS_LOG_FILE_LEVEL, ABS_LOG_FILE_ROTATE);

async function obtainNewJWT() {

    // Requisitando o JWT
    let JWT_AUTH_ENDPOINT = '/auth'
    let JWT_REQ = {
        method: 'post',
        url: AUTOBLOCKERSERVER_URL + JWT_AUTH_ENDPOINT,
        data: {
            "user": process.env.AUTOBLOCKERSERVER_USER,
            "password": process.env.AUTOBLOCKERSERVER_PASSWORD,
        }
    }
    log.debug(`[JWT_REQUEST] Obtendo novo JWT`)
    log.debug('[JWT_REQUEST] ' + JSON.stringify(JWT_REQ))
    let res = await axios.request(JWT_REQ)

    // Analisando o resultado pra ver se foi sucesso
    if (!res.status === 200) {
        log.error('[JWT_REQUEST] FAIL: Parece que não foi possível obter um JSON WEB TOKEN, o status da requisição está diferente do esperado: ' + JSON.stringify(res));
        return false
    }

    // Deu certo, agora seto esse JSON como disponível.
    log.debug("[JWT_REQUEST] SUCCESS: JSON Web Token obtido: " + res.data.token);
    process.env.JSON_WEB_TOKEN = res.data.token;
    return true
}

async function sendRequestToABS(AXIOS_REQUEST_PARAMS, isJwtRetry = false) {

    // Verificando se é necessário gerar um JWT novo
    if (!process.env.JSON_WEB_TOKEN | isJwtRetry) { await obtainNewJWT() }

    // Atualizando nos headers
    if (AXIOS_REQUEST_PARAMS.headers) { // se tem header, preciso preservá-lo
        AXIOS_REQUEST_PARAMS.headers.Authorization = process.env.JSON_WEB_TOKEN
    } else { // não tem o objeto de headers criado. Crio um e adiciono auth
        AXIOS_REQUEST_PARAMS.headers = { Authorization: process.env.JSON_WEB_TOKEN }
    }

    // DEBUG: manualmente atrapalhando o JWT pra simular um jwt expirado
    // if (!isJwtRetry) { AXIOS_REQUEST_PARAMS.headers.Authorization = 'w' }

    // Envia a requisição e retorna TUDO, completamente
    let res // inicializando a variável que vai segurar a resposta
    try {
        res = await axios.request(AXIOS_REQUEST_PARAMS)
    } catch (err) {

        // Analisando o erro: se for por causa de JWT
        if (err.response.status === 401) {
            log.warn(`[${err.response.status}] [${err.response.statusText}] Requisição falhou, aparentemente por JWT Inválido.`)
            if (!isJwtRetry) { // se for um jwtRetry, eu não posso enviar denovo, pq se não só looparia.
                log.debug('Tentando re-enviar a requisição...')
                return await sendRequestToABS(AXIOS_REQUEST_PARAMS, true)
            }
        }

        throw err
    }

    if (res.status === 204) {
        log.warn(`${JSON.stringify(AXIOS_REQUEST_PARAMS)} : Sem resultados!`)
    }
    return res.data
}

module.exports = (absqFind, mqBlock, mqUnblock, mqDisable, mqEnable, dqNotify) => {

    absqFind.process(ABSQFIND_CONC, async (job, done) => {
        const qlog = generateLogger(`FIND:${job.id}`, path.resolve(__dirname, ABS_LOG_LOCATION), ABS_LOG_LEVEL, ABS_LOG_FILE_LEVEL, ABS_LOG_FILE_ROTATE);
        qlog.debug("Starting job...");

        const STATUS_ACTIVE = [1];
        const STATUS_INACTIVE = [0];
        const STATUS_BLOCK = [4, 3, 2];

        // Prioriza o index 0 para ações de alteração:
        const IXC_STATUS_MAPPING = {
            'CA': STATUS_BLOCK,
            'CM': STATUS_BLOCK,
            'FA': STATUS_BLOCK,
            'AA': STATUS_BLOCK,
            'D': STATUS_INACTIVE,
            'A': STATUS_ACTIVE
        };

        // Preparando o array de erros.
        let ERRORS = [];

        // Array para reportar quando não houver alterações em um cliente
        let NO_CHANGE = [];

        // Preparando o objeto pra enviar pra alteração de contratos.
        let jobsToSend = {
            disable: [],
            enable: [],
            unblock: [],
            block: [],
        }

        function isActive(cs) { return STATUS_ACTIVE.includes(cs) };
        function isInactive(cs) { return STATUS_INACTIVE.includes(cs) };
        function isBlocked(cs) { return STATUS_BLOCK.includes(cs) };

        async function processClient(usuario, cliente, jobPayloads) {
            let statusMagnus = parseInt(cliente.status);
            let nome = cliente.nome;
            let contrato = cliente.contrato;
            let newMagnusStatus;
            
            function reportClientError(msg) {
                qlog.error(msg);
                ERRORS.push({
                    "cliente": nome,
                    "usuario": usuario,
                    // "data": cliente, 
                    "erro": msg
                });
                return;
            }

            async function searchClientInIxc(contract) {

                // Fazendo a requisição no IXC
                qlog.info('Pesquisando contrato ' + contract)
                let response = await sendRequestToABS({
                    method: 'POST',
                    url: `${AUTOBLOCKERSERVER_URL}/contract/check`,
                    data: {
                        contract: sha256(`${process.env.AUTOBLOCKERSERVER_SALT}${contract}`, { digest: 'hex' })
                    }
                });
    
                // Analisando se houve retorno, se conseguiu pesquisar o contrato
                if (!response) {
                    reportClientError(`Não foi retornado nenhum contrato na pesquisa do contrato "${contract}"`);
                    return null;
                }
                
                // clienteAtivo = response.contract.ativo;
                // statusIxc = response.contract.status_contrato;
                
                return response;
            };

            // Com base no status atual, e novo, retorna "block, unblock, enable, disable"
            function getAction(atual, novo, logPrefix = null) {
                atual = parseInt(atual);
                novo = parseInt(novo);
                
                let BLOQUEIO    = 'block'   // 1       -> 4, bloqueio
                let DESBLOQUEIO = 'unblock' // 2,3,4   -> 1, desbloqueio
                let ATIVACAO    = 'enable'  // 0       -> 1, ativacao
                let DESATIVACAO = 'disable' // 1,2,3,4 -> 0, desativação
                let action      = null;
                let logMessage  = null;
                logPrefix = logPrefix || contrato || 'prefix_not_set';

                if (isBlocked(atual)) {
                    if (isInactive(novo)) { action = DESATIVACAO };
                    if (isActive(novo)) { action = DESBLOQUEIO } ;
                } else if (isInactive(atual)) {
                    if (isBlocked(novo)) { logMessage = '?????????' }; // ué
                    if (isActive(novo)) { action = ATIVACAO };
                } else if (isActive(atual)) {
                    if (isBlocked(novo)) { action = BLOQUEIO };
                    if (isInactive(novo)) { action = DESATIVACAO };
                } else { logMessage = 'Direct error' }

                if (action) { logMessage = action }

                qlog.debug(`${logPrefix}: ${action}`)
                
                return action;
            }

            let ixc = await searchClientInIxc(contrato); // --> se isso for isNullOrUndefined, quero que dê "continue", se não, uso o valor dele msm
            if (!ixc) { return; };

            newMagnusStatus = IXC_STATUS_MAPPING[ixc.contract.status_contrato];
            if (newMagnusStatus.includes(statusMagnus)) { 
                qlog.trace("Status atual e novo são iguais. Ignorando.");
                NO_CHANGE.push({ "cliente": nome, "usuario": usuario, }); 
                return; 
            };

            let action = getAction(statusMagnus, newMagnusStatus[0]);
            if (!action) { qlog.error(`FAIL! //  Nome: ${nome} // ${statusMagnus} -> ${newMagnusStatus[0]}`); return; };

            jobPayloads[action].push({ 
                nome: nome, 
                usuario: usuario, 
                statusAtual: statusMagnus, 
                statusNovo: newMagnusStatus[0],
                action: action
            })

        }

        // Processando cada cliente recebido
        for (const [key, data] of Object.entries(job.data.hasContract)) {
            // Condição de guarda para as chaves 'ajudantes' que devem ser ignoradas
            if (['isActive', 'isInactive', 'isBlocked'].includes(key)) { continue };
            await processClient(key, data, jobsToSend)
        }

        log.info(`Processamento finalizado.`)

        log.info(`Desativações: ${jobsToSend.disable.length}`); job.log(`Desativações: ${jobsToSend.disable.length}`);
        if (jobsToSend.disable.length > 0) {log.trace(JSON.stringify(jobsToSend.disable))};

        log.info(`Ativações: ${jobsToSend.enable.length}`); job.log(`Ativações: ${jobsToSend.enable.length}`);
        if (jobsToSend.enable.length > 0) {log.trace(JSON.stringify(jobsToSend.enable))};

        log.info(`Bloqueios: ${jobsToSend.block.length}`); job.log(`Bloqueios: ${jobsToSend.block.length}`);
        if (jobsToSend.block.length > 0) {log.trace(JSON.stringify(jobsToSend.block))};
        
        log.info(`Desbloqueios: ${jobsToSend.unblock.length}`); job.log(`Desbloqueios: ${jobsToSend.unblock.length}`);
        if (jobsToSend.unblock.length > 0) {log.trace(JSON.stringify(jobsToSend.unblock))};

        log.info(`Sem alterações: ${NO_CHANGE.length}`); job.log(`Sem alterações: ${NO_CHANGE.length}`);
        if (NO_CHANGE.length > 0) {log.trace(JSON.stringify(NO_CHANGE))}

        log.info(`Erros: ${ERRORS.length}`); job.log(`Erros: ${ERRORS.length}`);
        if (ERRORS.length > 0) {log.error(JSON.stringify(ERRORS))};

        done(null, {});
    })

    log.info("Processor for abs.js registered successfully");
};