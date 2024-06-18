const path = require("path");
const { Logger } = require( path.resolve("src/util/logging") )
const { getMagnusBillingClient } = require( path.resolve("src/util/Utils") )
const { TagValidator } = require( path.resolve("src/util/TagValidator"))
const { ActionProcessor } = require( path.resolve("src/util/ActionProcessor") )

module.exports = {
    key: 'BlockClient',
    config: {},
    async handle(job, done, Queue) {
        job.data._JOB_INTERNAL_ID = `${module.exports.key}:${job.id}`;
        let counter = 0;
        for (const cliente of job.data.users) {
            counter++;
            const log = new Logger(`${job.data._JOB_INTERNAL_ID}:User:${cliente.usuario}`, false).useEnvConfig().setJob(job).create()

            clientTagsSchema = {"DONT_SEND_DISCORD_MESSAGE": {type: 'boolean', default: false}}
            let clientTags = new TagValidator(clientTagsSchema, job, cliente.tags) // Cada usuário tem sua própria tag
            let actionProcessor = await new ActionProcessor(job, cliente, getMagnusBillingClient(), clientTags).setMagnusUserId()

            if (await actionProcessor.statusEditSuccessful()) {
                msg=`Status alterado com sucesso: ${cliente.usuario} (${cliente.nome}): ${actionProcessor.magnusOldStatus} -> ${actionProcessor.magnusNewStatus}`
                job.log(msg)
                log.info(msg)
            } else {
                log.error(`Falha para alterar o status do usuário ${cliente.usuario} (${cliente.nome}): ${actionProcessor.magnusOldStatus} -> ${actionProcessor.magnusNewStatus}`)
            }            

            if (clientTags.DONT_SEND_DISCORD_MESSAGE) {
                log.unit(`DONT_SEND_DISCORD_MESSAGE: ${JSON.stringify(cliente)}`)
                continue;
            }

            Queue.add('DiscordMessage', {action: module.exports.key, ...cliente});
        }

        job.progress(100);
        if(job.progress()>=100) {
            done(null, {})
        }
    }
}
