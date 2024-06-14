const path = require("path");
const { generateLogger } = require( path.resolve("src/util/logging") )
const { getMagnusBillingClient } = require( path.resolve("src/util/Utils") )
const { TagValidator } = require( path.resolve("src/util/TagValidator"))
const { ActionProcessor } = require( path.resolve("src/util/ActionProcessor") )

let LOG_NAME = "DisableClient"
let LOG_LOCATION = "logs/app"
let LOG_LEVEL = 10
let LOG_FILE_LEVEL = 10
let LOG_FILE_ROTATE = "30d"

module.exports = {
    key: 'DisableClient',
    async handle(job, done, Queue) {
        job.data._JOB_IID = `${LOG_NAME}:${job.id}`;
        const log = generateLogger(job.data._JOB_IID, path.resolve(LOG_LOCATION), LOG_LEVEL, LOG_FILE_LEVEL, LOG_FILE_ROTATE);

        log.trace(`Job data: ${JSON.stringify(job.data)}`)

        let counter = 0;
        for (const cliente of job.data.users) {
            counter++;
            log.unit(`Counter: ${counter} | Client: ${JSON.stringify(cliente)}`);

            clientTagsSchema = {"DONT_SEND_DISCORD_MESSAGE": {type: 'boolean', default: false}}
            let clientTags = new TagValidator(clientTagsSchema, job, cliente.tags) // Cada usuário tem sua própria tag
            let actionProcessor = await new ActionProcessor(job, cliente, getMagnusBillingClient(), clientTags).setMagnusUserId()

            if (await actionProcessor.statusEditSuccessful()) {
                log.unit(`Status alterado com sucesso: ${cliente.usuario} (${cliente.nome}): ${actionProcessor.magnusOldStatus} -> ${actionProcessor.magnusNewStatus}`)
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
