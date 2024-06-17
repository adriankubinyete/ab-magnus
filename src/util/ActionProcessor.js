const path = require("path");
const { Logger } = require(path.resolve("src/util/logging"));

class ActionProcessor {
    constructor(job, cliente, magnusBillingClient, tagProcessor) {
        // Loggers/Validators
        this.LOG_NAME = `${job.data._JOB_INTERNAL_ID}:ActionProcessor:${cliente.usuario}`
        this.log = new Logger(this.LOG_NAME, false).useEnvConfig().create()
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
