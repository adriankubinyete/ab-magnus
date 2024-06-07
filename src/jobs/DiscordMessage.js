const path = require("path");
const { formatDiscordMessage } = require(path.resolve("src/util/Utils"))
const { generateLogger } = require(path.resolve("src/util/logging"))
const { Webhook, MessageBuilder } = require('discord-webhook-node');     

let LOG_NAME = "p:DiscordMessage"
let LOG_LOCATION = "logs/app"
let LOG_LEVEL = 10
let LOG_FILE_LEVEL = 10
let LOG_FILE_ROTATE = "30d"

let messages = {
    block: (VAR_MAPPING) => {
        return new MessageBuilder()
        .setTitle('NOTIFICAÇÃO DE BLOQUEIO')
        .setColor('#FF3C3C')
        .setURL('https://phonevox.com.br')
        .setTimestamp()
        .setThumbnail('https://em-content.zobj.net/source/twitter/103/lock_1f512.png')
        .setDescription(formatDiscordMessage(process.env.DISCORD_REPORT_MESSAGE, VAR_MAPPING))
    },
    unblock: (VAR_MAPPING) => {
        return new MessageBuilder()
        .setTitle('NOTIFICAÇÃO DE DESBLOQUEIO')
        .setColor('#1AFF1A')
        .setURL('https://phonevox.com.br')
        .setTimestamp()
        .setThumbnail('https://static-00.iconduck.com/assets.00/open-lock-emoji-370x512-vszsnxmi.png')
        .setDescription(formatDiscordMessage(process.env.DISCORD_REPORT_MESSAGE, VAR_MAPPING))
    },
    activate: (VAR_MAPPING) => {
        return new MessageBuilder()
        .setTitle('NOTIFICAÇÃO DE ATIVAÇÃO')
        .setColor('#1AFF1A')
        .setURL('https://phonevox.com.br')
        .setTimestamp()
        .setThumbnail('https://em-content.zobj.net/source/toss-face/381/check-mark-button_2705.png') // box checkmark verde
        .setDescription(formatDiscordMessage(process.env.DISCORD_REPORT_MESSAGE, VAR_MAPPING))
    },
    inactivate: (VAR_MAPPING) => {
        return new MessageBuilder()
        .setTitle('NOTIFICAÇÃO DE INATIVAÇÃO')
        .setColor('#FF1A1A')
        .setURL('https://phonevox.com.br')
        .setTimestamp()
        .setThumbnail('https://em-content.zobj.net/source/toss-face/381/cross-mark-button_274e.png') // box X vermelho
        .setDescription(formatDiscordMessage(process.env.DISCORD_REPORT_MESSAGE, VAR_MAPPING))
    },
    error: (VAR_MAPPING) => {
        return new MessageBuilder()
        .setTitle('ALGUM ERRO OCORREU!')
        .setColor('#FF00FF')
        .setURL('https://phonevox.com.br')
        .setTimestamp()
        .setThumbnail('https://cdn1.iconfinder.com/data/icons/ui-colored-3-of-3/100/UI_3_-38-512.png')
        .setDescription(formatDiscordMessage(process.env.DISCORD_REPORT_MESSAGE, VAR_MAPPING))
    },
    debug: (VAR_MAPPING) => {
        return new MessageBuilder()
        .setTitle('DEBUG')
        .setColor('#3C8CFF')
        .setURL('https://phonevox.com.br')
        .setTimestamp()
        .setDescription(formatDiscordMessage(process.env.DISCORD_REPORT_MESSAGE, VAR_MAPPING))
    }
}

function getMessageForAction(action) {
    switch (key) {
        case '':
            break;
        case '':
            break;
        case '':
            break;
        case '':
            break;
        case '':
            break;
        case '':
            break;
        default:
            return false;
    }
}

module.exports = {
    key: 'DiscordMessage',
    required: ['originator', 'nome', 'usuario', 'statusAtual', 'statusNovo'],
    config: {limiter: { max: 5, duration: 5 * 1000 }},
    async handle(job, done, Queue) {
        const JOB_NAME = `${LOG_NAME}:${job.id}`; 
        const log = generateLogger(JOB_NAME, path.resolve(LOG_LOCATION), LOG_LEVEL, LOG_FILE_LEVEL, LOG_FILE_ROTATE);
        const VAR_MAP = {
            job: JOB_NAME,
            nome: job.data.nome,
            usuario: job.data.usuario,
            statusAtual: job.data.statusAtual,
            statusNovo: job.data.statusNovo
        }
        const hook = new Webhook(process.env.DISCORD_WEBHOOK);

        // aqui eu decido qual a template da minha mensagem: bloqueio, desbloqueio, etc.
        // preencher as informações de cliente
        // enviar a mensagem
        hook.send(messages.debug(VAR_MAP));
        // hook.send(messages.unblock(VAR_MAP));
        // hook.send(messages.activate(VAR_MAP));
        // hook.send(messages.inactivate(VAR_MAP));
        // hook.send(messages.error(VAR_MAP));
        // hook.send(messages.debug(VAR_MAP));

        // gerar o hook
        // escolher a template correta de mensagem
        // * se for um erro, confirmar se será enviado pro hook principal ou secundário
        // preencher as informações do cliente na request 
        // enviar a mensagem

        job.progress(100);
        done();
    }
}
