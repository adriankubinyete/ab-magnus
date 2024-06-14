const path = require("path");
const { generateLogger } = require(path.resolve("src/util/logging"))
const { sha256, sendRequestABS } = require(path.resolve("src/util/Utils"))

class ClientProcessor {
    constructor(log, queue, tags = {}) {
        this.Queue = queue;
        this.log = log;
        this.tags = {
            DRY: tags.DRY ?? false,
            DONT_LOG_ABOUT_REQUESTS: tags.DONT_LOG_ABOUT_REQUESTS ?? true,
            FINAL_REPORT_VERBOSELY: tags.FINAL_REPORT_VERBOSELY ?? false,
        }

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

        // Quais os trabalhos à serem feitos.
        this.JOBS = {
            toDisable: [],
            toEnable: [],
            toBlock: [],
            toUnblock: [],
            noChange: [],
            errors: []
        }

    }

    executeNotifyError(data) {
        this.JOBS.errors.push(data);
        if (this.tags.DRY) {
            this.log.unit(`DRY: NotifyError (${data.nome})`);
            return this;
        }

        this.Queue.add('DiscordMessage', data)
        return this;
    }

    executeNoChange(data) {
        this.JOBS.noChange.push(data);
        if (this.tags.DRY) {
            this.log.unit(`DRY: NoChange (${data.nome})`);
            return this;
        }

        // this.Queue.add('DiscordMessage', data)
        return this;
    }

    executeBlock(data) {
        this.JOBS.toBlock.push(data);
        if (this.tags.DRY) {
            this.log.unit(`DRY: Block (${data.nome})`);
            return this;
        }

        this.Queue.add('BlockClient', {users: [data]})
        return this;
    }

    executeUnblock(data) {
        this.JOBS.toUnblock.push(data);
        if (this.tags.DRY) {
            this.log.unit(`DRY: Unblock (${data.nome});`) 
            return this;
        }

        this.Queue.add('UnblockClient', {users: [data]})
        return this;
    }

    executeEnable(data) {
        this.JOBS.toEnable.push(data);
        if (this.tags.DRY) {
            this.log.unit(`DRY: Enable (${data.nome})`);
            return this;
        }

        this.Queue.add('EnableClient', {users: [data]})
        return this;
    }

    executeDisable(data) {
        this.JOBS.toDisable.push(data);
        if (this.tags.DRY) {
            this.log.unit(`DRY: Disable (${data.nome})`);
            return this;
        }

        this.Queue.add('DisableClient', {users: [data]})
        return this;
    }

    getReport(mode = null) {

        if (this.tags.FINAL_REPORT_VERBOSELY) { 
            return {
                total: (this.JOBS.toDisable.length + this.JOBS.toEnable.length + this.JOBS.toBlock.length + this.JOBS.toUnblock.length + this.JOBS.noChange.length + this.JOBS.errors.length), 
                ...this.JOBS
            }
        }

        return {
            total: (this.JOBS.toDisable.length + this.JOBS.toEnable.length + this.JOBS.toBlock.length + this.JOBS.toUnblock.length + this.JOBS.noChange.length + this.JOBS.errors.length),
            toDisable: this.JOBS.toDisable.length,
            toEnable: this.JOBS.toEnable.length,
            toBlock: this.JOBS.toBlock.length,
            toUnblock: this.JOBS.toUnblock.length,
            noChange: this.JOBS.noChange.length,
            errors: this.JOBS.errors.length,        
        }
    }

    // Utilitário: encontra o cliente no IXCBS utilizando um contrato.
    async findClientViaContractInABS(contrato) {
        let REQUEST_METHOD = 'POST';
        let REQUEST_URL = `${this.ABS_URL}/${this.ABS_CHECK_CONTRACT_ENDPOINT}`;
        let REQUEST_DATA = { contract: sha256(`${this.ABS_SALT}${contrato}`, { digest: 'hex' }) }
        let REQUEST = {
            method: REQUEST_METHOD,
            url: REQUEST_URL,
            data: REQUEST_DATA
        }

        if (!this.tags.DONT_LOG_ABOUT_REQUESTS) { this.log.unit(`Sent to ABS: ${JSON.stringify(REQUEST)}`) };
        let r = await sendRequestABS(REQUEST);
        if (!this.tags.DONT_LOG_ABOUT_REQUESTS) { this.log.unit(`Response from ABS: ${JSON.stringify(r)}`) };
        if (!r) { throw new Error(`Sem resposta para a pesquisa do contrato ${contrato}`) } else {return r};
    }

    // Utilitário: 
    getAction(oldStatus, newStatus) {
        let retFunction // Função que vou retornar ao finalizar getAction
        oldStatus = parseInt(oldStatus);
        newStatus = parseInt(newStatus);
    
        if (newStatus === oldStatus) { // status igual
            retFunction = this.executeNoChange
        } else if (this.STATUS_BLOCK.includes(oldStatus)) { // está bloqueado
            if (this.STATUS_INACTIVE.includes(newStatus)) { retFunction = this.executeDisable };
            if (this.STATUS_ACTIVE.includes(newStatus)) { retFunction = this.executeUnblock } ;

        } else if (this.STATUS_INACTIVE.includes(oldStatus)) { // está inativo
            if (this.STATUS_BLOCK.includes(newStatus)) { throw new Error("Está inativo, e vai bloquear. Não faz sentido") }; // ué
            if (this.STATUS_ACTIVE.includes(newStatus)) { retFunction = this.executeEnable };

        } else if (this.STATUS_ACTIVE.includes(oldStatus)) { // está ativo
            if (this.STATUS_BLOCK.includes(newStatus)) { retFunction = this.executeBlock };
            if (this.STATUS_INACTIVE.includes(newStatus)) { retFunction = this.executeDisable };
        } else { throw new Error(`Status não mapeado. "Erro direto"`) } // erro

        // Bindando "this" pra essa função, pra poder utilizar this.REPORT
        return retFunction.bind(this)
    }

    async processClient(cliente) {
        this.log.unit(`Current client data: ${JSON.stringify(cliente)}`);
        try {
            // Obtendo as informações desse contrato no ABS
            const ixc = await this.findClientViaContractInABS(cliente.contrato);
            let magnusStatusAntigo = cliente.statusMagnus
            let magnusStatusNovo = this.IXC_TO_MAGNUS[ixc.contract.status_contrato][0]

            // Usando as informações obtidas pra comparar o status antigo com o atual, e decidir uma ação
            this.log.debug(`${cliente.nome}: Status atual: [${magnusStatusAntigo}], Status novo: [${magnusStatusNovo}]`)
            const executeAction = this.getAction(magnusStatusAntigo, magnusStatusNovo);
            
            // Executando a ação de fato
            let OUTPUT_DATA = cliente
            executeAction(OUTPUT_DATA)

            // Ações:
            // Block / Unblock / Disable / Enable -> Criam jobs em outras filas
            // NoChange -> Não faz nada
        } catch (error) {
            console.log('UM ERRO OCORREU: ' + error.stack)
            this.executeNotifyError(cliente) // Deve enviar uma mensagem explicando o que houve.
            // se não conseguiu mapear uma ação, falha
            // deve reportar o erro pra fila
        }
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

        // Estou assumindo que a estrutura que chega até mim é:
        // job.data = {
        //     tags: {originator: <origem>},
        //     users: {
        //         "<usuario>": {...<dadosDoUsuario>}
        //     }
        // }

        const clientProcessor = new ClientProcessor(log, Queue, {DRY: false, FINAL_REPORT_VERBOSELY: false});
        for (const [key, data] of Object.entries(job.data.users)) {
            if (keyShouldBeIgnored(key)) { return; };
            await clientProcessor.processClient(data);
        }

        log.info(`Processamento finalizado.`)
        log.info(clientProcessor.getReport())

        done(null, {});
    }
}
