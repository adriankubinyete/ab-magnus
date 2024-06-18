const path = require("path");
const { Logger } = require(path.resolve("src/util/logging"))
const { TagValidator } = require( path.resolve("src/util/TagValidator") )
const { sha256, sendRequestABS } = require(path.resolve("src/util/Utils"))
class ClientProcessor {
    constructor(log, queue, tags = {}) {
        this.Queue = queue;
        this.log = log;
        this.tags = {
            DRY: tags.DRY ?? false,
            DONT_LOG_ABOUT_REQUESTS: tags.DONT_LOG_ABOUT_REQUESTS ?? true,
            FINAL_REPORT_VERBOSELY: tags.FINAL_REPORT_VERBOSELY ?? false,
            DONT_REPORT_NOCHANGE: tags.DONT_REPORT_NOCHANGE ?? process.env.DONT_REPORT_NOCHANGE ?? true
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

        this.Queue.add('BlockClient', data)
        return this;
    }

    executeUnblock(data) {
        this.JOBS.toUnblock.push(data);
        if (this.tags.DRY) {
            this.log.unit(`DRY: Unblock (${data.nome});`) 
            return this;
        }

        this.Queue.add('UnblockClient', data)
        return this;
    }

    executeEnable(data) {
        this.JOBS.toEnable.push(data);
        if (this.tags.DRY) {
            this.log.unit(`DRY: Enable (${data.nome})`);
            return this;
        }

        this.Queue.add('EnableClient', data)
        return this;
    }

    executeDisable(data) {
        this.JOBS.toDisable.push(data);
        if (this.tags.DRY) {
            this.log.unit(`DRY: Disable (${data.nome})`);
            return this;
        }

        this.Queue.add('DisableClient', data)
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

        if (!this.tags.DONT_LOG_ABOUT_REQUESTS) { this.log.unit(`FindClient: Requisição enviada: ${JSON.stringify(REQUEST)}`) };
        let r = await sendRequestABS(REQUEST);
        if (!this.tags.DONT_LOG_ABOUT_REQUESTS) { this.log.unit(`FindClient: Resposta recebida: ${JSON.stringify(r)}`) };
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
        try {
            this.log.info(`Processando cliente "${cliente.nome}" (${cliente.usuario})...`)
            // Obtendo as informações desse contrato no ABS
            const ixc = await this.findClientViaContractInABS(cliente.contrato);
            cliente.statusMagnus = cliente.statusMagnus
            cliente.statusIxc = this.IXC_TO_MAGNUS[ixc.contract.status_contrato][0]
            cliente.statusIxcVerbose = ixc.contract.status_contrato

            // Usando as informações obtidas pra comparar o status antigo com o atual, e decidir uma ação
            job.log(`${cliente.usuario} : ${cliente.statusMagnus} -> ${cliente.statusIxc} (${cliente.statusIxcVerbose}) (${cliente.nome})`) // sim, job.log
            const executeAction = this.getAction(cliente.statusMagnus, cliente.statusIxc);
            
            // Executando a ação de fato
            let OUTPUT_DATA = {tags: {originator: job.data._JOB_INTERNAL_ID}, users: [cliente]}
            executeAction(OUTPUT_DATA)
        } catch (error) {
            this.log.error(`Um erro ocorreu ao processar o cliente ${cliente.nome} (${cliente.usuario}): ${error}`)
            this.log.error(error.stack)
            this.log.debug(JSON.stringify(cliente))
            this.executeNotifyError(cliente) // Deve enviar uma mensagem explicando o que houve.
        }
    }
}

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
        job.data._JOB_INTERNAL_ID = `${module.exports.key}:${job.id}`;
        const log = new Logger(job.data._JOB_INTERNAL_ID, false).useEnvConfig().setJob(job).create()
        log.trace(`Job Data: ${job.data}`)

        const clientProcessor = new ClientProcessor(log, Queue, {DRY: false, FINAL_REPORT_VERBOSELY: false});

        let USERS_TO_SEARCH = job.data.users.length;
        let USERS_COUNTER = 0;

        log.info(`Iniciando o processamento dos clientes.`)
        for (const [key, data] of Object.entries(job.data.users)) {
            USERS_COUNTER++
            if (keyShouldBeIgnored(key)) { 
                log.info(`Ignorando a chave "${key}", com os seguintes dados: ${data}`)
                return; 
            }
            await clientProcessor.processClient(data);

            // aqui eu atualizo o progress
        }
        log.info(`Processamento de clientes finalizado.`)
        log.info( JSON.stringify(clientProcessor.getReport()) )

        done(null, {});
    }
}
