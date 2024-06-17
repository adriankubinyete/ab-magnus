const path = require("path");
const { generateLogger } = require(path.resolve("src/util/logging"));

let LOG_LOCATION = "logs/app"
let LOG_LEVEL = 10
let LOG_FILE_LEVEL = 10
let LOG_FILE_ROTATE = "30d"

class ActionProcessor {
    constructor(job, cliente, magnusBillingClient, tagProcessor) {
        // Loggers/Validators
        this.log = generateLogger(`${job.data._JOB_IID}:actionProcessor:${cliente.usuario}`, path.resolve(LOG_LOCATION), LOG_LEVEL, LOG_FILE_LEVEL, LOG_FILE_ROTATE)
        this.tag = tagProcessor;
        // this.tag.overwriteTag('DRY', true); // Dev-only
        
        // Client config
        this.cliente = cliente;
        this.mb = magnusBillingClient;
        this.magnusOldStatus = this.cliente.statusMagnus;
        this.magnusNewStatus = this.cliente.statusIxc;
        this.magnusUserId = undefined;
    }

    async setMagnusUserId() {
        this.magnusUserId = await this.mbGetClientIdFromUsername(this.cliente.usuario)
        return this;
    }

    async execStatusEdit() {        
        return await this.mbEditUserStatus(this.magnusUserId, this.magnusNewStatus)
    }

    async statusEditSuccessful() {
        return await this.execStatusEdit()
    }

    async mbEditUserStatus(userId, newStatus) {
        if (this.tag.DRY) {
            this.log.debug(`DRY: EditUserStatus: ID:${userId} -> New: ${newStatus}`);
            return true;
        }
        
        this.log.debug(`DRY: EditUserStatus: ID:${userId} -> New: ${newStatus}`);
        let ret = await this.mb.clients.users.edit({
            id: userId,
            active: newStatus
        })

        if (ret && ret.success == true) {
            this.log.trace(`EditUserStatus return: ${JSON.stringify(ret)}`)
            return true
        } else { 
            this.log.error("Alguma coisa aconteceu, não foi possível editar o status do usuário")
            return false
        }

    }

    async mbGetClientIdFromUsername(username) {
        let ret = await this.mb.clients.users.getid({
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

}

module.exports = {
    ActionProcessor
}
