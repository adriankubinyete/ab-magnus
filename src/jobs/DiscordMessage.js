const path = require("path");
const { Logger } = require(path.resolve("src/util/logging"))
const { formatDiscordMessage } = require(path.resolve("src/util/Utils"))
const { Webhook, MessageBuilder } = require('discord-webhook-node');     

let embedTemplate = {
    BlockClient : {
        type: "PRODUCTION",
        title: "NOTIFICAÇÃO DE BLOQUEIO",
        hexColor: "#FF3C3C",
        thumbnail: "https://em-content.zobj.net/source/twitter/103/lock_1f512.png",
        url: "https://phonevox.com.br",
    },
    UnblockClient : {
        type: "PRODUCTION",
        title: "NOTIFICAÇÃO DE DESBLOQUEIO",
        hexColor: "#1AFF1A",
        thumbnail: "https://static-00.iconduck.com/assets.00/open-lock-emoji-370x512-vszsnxmi.png",
        url: "https://phonevox.com.br",
    },
    DisableClient : {
        type: "PRODUCTION",
        title: "NOTIFICAÇÃO DE INATIVAÇÃO",
        hexColor: "#FF1A1A",
        thumbnail: "https://em-content.zobj.net/source/toss-face/381/cross-mark-button_274e.png",
        url: "https://phonevox.com.br",
    },
    EnableClient : {
        type: "PRODUCTION",
        title: "NOTIFICAÇÃO DE ATIVAÇÃO",
        hexColor: "#1AFF1A",
        thumbnail: "https://em-content.zobj.net/source/toss-face/381/check-mark-button_2705.png",
        url: "https://phonevox.com.br",
    },
    ReportError : {
        type: "ERROR",
        title: "ALGUM ERRO OCORREU!",
        hexColor: "#FF00FF",
        thumbnail: "https://cdn1.iconfinder.com/data/icons/ui-colored-3-of-3/100/UI_3_-38-512.png",
        url: "https://phonevox.com.br",
    },
    debug : {
        type: "DEBUG",
        title: "DEBUG",
        hexColor: "#3C8CFF",
        thumbnail: null,
        url: "https://phonevox.com.br",
    },
}

let messages = {
    debug: () => {
        return new MessageBuilder()
        .setTitle('DEBUG')
        .setColor('#3C8CFF')
        .setURL('https://phonevox.com.br')
        .setTimestamp()
    }
}

function getMessageForAction(log, job) {
    let preset = embedTemplate[(job.data.action ?? 'debug')];
    return new MessageBuilder()
    .setTitle(preset.title)
    .setColor(preset.hexColor)
    .setURL(preset.url)
    .setThumbnail(preset.thumbnail)
    .setDescription(formatDiscordMessage(log, process.env.DISCORD_REPORT_MESSAGE, job.data))
}

module.exports = {
    key: 'DiscordMessage',
    // required: ['originator', 'nome', 'usuario', 'statusAtual', 'statusNovo'], // FEATURE: implementar isso pra todos, eventualmente
    config: {limiter: { max: 5, duration: 5 * 1000 }},
    async handle(job, done, Queue) {
        job.data._JOB_INTERNAL_ID = `${module.exports.key}:${job.id}:User:${job.data.usuario}:${job.data.action??'noActionDetermined'}`;
        const log = new Logger(job.data._JOB_INTERNAL_ID, false).useEnvConfig().setJob(job).create()
        log.unit(`Job Data: ${JSON.stringify(job.data)}`)

        // Default values
        job.data._WEBHOOK_URL=process.env.DISCORD_WEBHOOK // REFATORAR: Fiz isso pra implementação de tag, mas vou fazer a implementação de tags uma outra hora, sendo generalista (pra incluir as outras filas se necessário alguma tag nelas)

        // Runtime
        log.trace(`Obtendo a embed...`)
        let embed = getMessageForAction(log, job) // REFATORAR: analisar alguma forma de não necessitar passar job aqui?
        log.unit(`Embed: ${JSON.stringify(embed)}`)


        log.trace(`Enviando mensagem para o webhook...`)
        if (process.env.SEND_ERRORS_ELSEWHERE) {
            if (!job.data["action"].includes("Client")) {
                log.unit(`Action "${job.data.action}" does not include "Client": sending to alternate webhook.`)
                job.data._WEBHOOK_URL=process.env.DISCORD_ERRORS_WEBHOOK
            }
        }
        log.unit(`Webhook URL: ${job.data._WEBHOOK_URL}`)
        const hook = new Webhook(job.data._WEBHOOK_URL);
        hook.send(embed);

        job.progress(100);
        done(null, {});
    }
}
