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

    async executeNotifyError(cliente) {
        console.log('Execute Notify Error')

    }

    async executeNoChange(cliente) {
    console.log('Execute No Change')
    }

    async executeBlock(cliente) {
    console.log('Execute Block')
    }

    async executeUnblock(cliente) {
      console.log('Execute Unblock')  
    }

    async executeEnable(cliente) {
      console.log('Execute Enable')  
    }

    async executeDisable(cliente) {
       console.log('Execute Disable') 
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
        this.log.trace(REQUEST)
        let r = await sendRequestABS(REQUEST);
        this.log.unit(`Response from ABS: ${JSON.stringify(r)}`)

        if (!r) { throw new Error(`Sem resposta para a pesquisa do contrato ${contrato}`) } else {return r};
    }

    // Utilitário: 
    async getAction(oldStatus, newStatus) {
        oldStatus = parseInt(oldStatus);
        newStatus = parseInt(newStatus);

        this.log.info('Old status: ' + oldStatus + ', New Status: ' + newStatus)

        // Utilitárias pra melhor legibilidade
        if (newStatus === oldStatus) {
            return this.executeNoChange
        }

        if (this.STATUS_BLOCK.includes(oldStatus)) {
            if (this.STATUS_INACTIVE.includes(newStatus)) { return this.executeDisable };
            if (this.STATUS_ACTIVE.includes(newStatus)) { return this.executeUnblock } ;
        } else if (this.STATUS_INACTIVE.includes(oldStatus)) {
            if (this.STATUS_BLOCK.includes(newStatus)) { throw new Error("Está inativo, e vai bloquear. Não faz sentido") }; // ué
            if (this.STATUS_ACTIVE.includes(newStatus)) { return this.executeEnable };
        } else if (this.STATUS_ACTIVE.includes(oldStatus)) {
            if (this.STATUS_BLOCK.includes(newStatus)) { return this.executeBlock };
            if (this.STATUS_INACTIVE.includes(newStatus)) { return this.executeDisable };
        } else { throw new Error(`Status não mapeado. "Erro direto"`) } // erro
    }

    async processClient(cliente) {
        this.log.unit('Client data: ' + JSON.stringify(cliente));
        try {
            const ixc = await this.findClientViaContractInABS(cliente.contrato);
            const executeAction = await this.getAction(cliente.status, this.IXC_TO_MAGNUS[ixc.contract.status_contrato][0]);
            executeAction(cliente) // isso vai executar unblock/block/disable/enable/nochange
        } catch (error) {
            console.log('UM ERRO OCORREU: ' + error.stack)
            this.executeNotifyError(cliente)
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

        // Processando cada cliente recebido
        // Estou assumindo que a estrutura que chega até mim é:

        // job.data = {
        //     tags: {originator: <origem>},
        //     users: {
        //         "<usuario>": {...<dadosDoUsuario>}
        //     }
        // }

        const clientProcessor = new ClientProcessor(log);
        for (const [key, data] of Object.entries(job.data.users)) {
            if (keyShouldBeIgnored(key)) { return; };
            await clientProcessor.processClient(data);
        }

        log.info(`Processamento finalizado.`)

        done(null, {});
    }
}
