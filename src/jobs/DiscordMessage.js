const path = require("path");
const { formatDiscordMessage } = require(path.resolve("src/util/Utils"))
const { generateLogger } = require(path.resolve("src/util/logging"))
const { Webhook, MessageBuilder } = require('discord-webhook-node');     

let LOG_NAME = "p:DiscordMessage"
let LOG_LOCATION = "logs/app"
let LOG_LEVEL = 10
let LOG_FILE_LEVEL = 10
let LOG_FILE_ROTATE = "30d"

let embedTemplate = {
    block : {
        title: "NOTIFICAÇÃO DE BLOQUEIO",
        hexColor: "#FF3C3C",
        thumbnail: "https://em-content.zobj.net/source/twitter/103/lock_1f512.png",
        url: "https://phonevox.com.br",
    },
    unblock : {
        title: "NOTIFICAÇÃO DE BLOQUEIO",
        hexColor: "#1AFF1A",
        thumbnail: "https://static-00.iconduck.com/assets.00/open-lock-emoji-370x512-vszsnxmi.png",
        url: "https://phonevox.com.br",
    },
    disable : {
        title: "NOTIFICAÇÃO DE INATIVAÇÃO",
        hexColor: "#FF1A1A",
        thumbnail: "https://em-content.zobj.net/source/toss-face/381/cross-mark-button_274e.png",
        url: "https://phonevox.com.br",
    },
    enable : {
        title: "NOTIFICAÇÃO DE ATIVAÇÃO",
        hexColor: "#1AFF1A",
        thumbnail: "https://em-content.zobj.net/source/toss-face/381/check-mark-button_2705.png",
        url: "https://phonevox.com.br",
    },
    error : {
        title: "ALGUM ERRO OCORREU!",
        hexColor: "#FF00FF",
        thumbnail: "https://cdn1.iconfinder.com/data/icons/ui-colored-3-of-3/100/UI_3_-38-512.png",
        url: "https://phonevox.com.br",
    },
    debug : {
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

function getMessageForAction(job) {
    let preset = embedTemplate[job.data.action];
    return new MessageBuilder()
    .setTitle(preset.title) // bizzaro mas funciona :D
    .setColor(preset.color)
    .setURL(preset.url)
    .setThumbnail(preset.thumbnail)
    .setDescription(formatDiscordMessage(process.env.DISCORD_REPORT_MESSAGE, job.data))
}

module.exports = {
    key: 'DiscordMessage',
    // required: ['originator', 'nome', 'usuario', 'statusAtual', 'statusNovo'], // FEATURE: implementar isso pra todos, eventualmente
    config: {limiter: { max: 5, duration: 5 * 1000 }},
    async handle(job, done, Queue) {
        job.data._JOB_IID = `${LOG_NAME}:${job.id}`
        const log = generateLogger(job.data._JOB_IID, path.resolve(LOG_LOCATION), LOG_LEVEL, LOG_FILE_LEVEL, LOG_FILE_ROTATE);

        // Default values
        job.data._WEBHOOK_URL=process.env.DISCORD_WEBHOOK // REFATORAR: Fiz isso pra implementação de tag, mas vou fazer a implementação de tags uma outra hora, sendo generalista (pra incluir as outras filas se necessário alguma tag nelas)

        // Runtime        
        const hook = new Webhook(job.data._WEBHOOK_URL);
        let embed = getMessageForAction(job) // REFATORAR: analisar alguma forma de não necessitar passar job aqui?
        hook.send(embed);

        job.progress(100);
        done();
    }
}
