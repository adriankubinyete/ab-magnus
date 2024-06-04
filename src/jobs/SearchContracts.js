const path = require("path");
const { generateLogger } = require(path.resolve("src/util/logging"))
const { sha256, sendRequestABS } = require(path.resolve("src/util/Utils"))

let ABS_LOG_NAME = "p:SearchContract"
let ABS_LOG_LOCATION = "logs/app"
let ABS_LOG_LEVEL = 10
let ABS_LOG_FILE_LEVEL = 10
let ABS_LOG_FILE_ROTATE = "30d"

module.exports = {
    key: 'SearchContracts',
    async handle(job, done, Queue) {
        const log = generateLogger(`${ABS_LOG_NAME}:${job.id}`, path.resolve(ABS_LOG_LOCATION), ABS_LOG_LEVEL, ABS_LOG_FILE_LEVEL, ABS_LOG_FILE_ROTATE);
        log.debug("Starting job...");

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
                log.error(msg);
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
                log.info('Pesquisando contrato ' + contract)
                let CHECK_CONTRACT_ENDPOINT = '/contract/check';
                let response = await sendRequestABS({
                    method: 'POST',
                    url: `${process.env.AUTOBLOCKERSERVER_PROTOCOL}://${process.env.AUTOBLOCKERSERVER_HOST}:${process.env.AUTOBLOCKERSERVER_PORT}${CHECK_CONTRACT_ENDPOINT}`,
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

                log.debug(`${logPrefix}: ${action}`)
                
                return action;
            }

            let ixc = await searchClientInIxc(contrato); // --> se isso for isNullOrUndefined, quero que dê "continue", se não, uso o valor dele msm
            if (!ixc) { return; };

            newMagnusStatus = IXC_STATUS_MAPPING[ixc.contract.status_contrato];
            if (newMagnusStatus.includes(statusMagnus)) { 
                log.trace("Status atual e novo são iguais. Ignorando.");
                NO_CHANGE.push({ "cliente": nome, "usuario": usuario, }); 
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
        // "usuario:string" : {
        //     "nome": nome:string,
        //     "usuario": usuario:string,
        //     "contrato": contrato:string,
        //     "status": status:integer // Refere-se ao status atual no MAGNUS. Usado pra descobrir se será um BLOQUEIO, DESBLOQUEIO, ATIVAÇÃO ou DESATIVAÇÃO
        //     "tags": tags:list // Opcional, lista de tags especiais, como "overwrite", "dry", etc. (NÃO IMPLEMENTADO)
        // }
        // Pra cada usuário, só acrescentar outro no final.
        for (const [key, data] of Object.entries(job.data)) {
            // Condição de guarda para as chaves 'ajudantes' que devem ser ignoradas
            if (['isActive', 'isInactive', 'isBlocked'].includes(key)) { 
                log.test(`${key} está presente!`);
                continue;
             };
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
    }
}
