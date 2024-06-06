const path = require("path");
const { generateLogger } = require( path.resolve("src/util/logging") )
const { Webhook, MessageBuilder } = require('discord-webhook-node');     

let LOG_NAME = "p:DiscordMessage"
let LOG_LOCATION = "logs/app"
let LOG_LEVEL = 10
let LOG_FILE_LEVEL = 10
let LOG_FILE_ROTATE = "30d"

let messages = {
    block: () => {
        return new MessageBuilder()
        .setTitle('NOTIFICAÇÃO DE BLOQUEIO')
        .setColor('#FF0000') // vermelho
        .setURL('https://phonevox.com.br')
        .setTimestamp()
        .setThumbnail('https://em-content.zobj.net/source/twitter/103/lock_1f512.png');
    },
    unblock: () => {
        return new MessageBuilder()
        .setTitle('NOTIFICAÇÃO DE DESBLOQUEIO')
        .setColor('#00FF00') // verde
        .setURL('https://phonevox.com.br')
        .setTimestamp()
        .setThumbnail('https://static-00.iconduck.com/assets.00/open-lock-emoji-370x512-vszsnxmi.png');
    },
    activate: () => {
        return new MessageBuilder()
        .setTitle('NOTIFICAÇÃO DE ATIVAÇÃO')
        .setColor('#0000FF') // azul
        .setURL('https://phonevox.com.br')
        .setTimestamp()
    },
    inactivate: () => {
        return new MessageBuilder()
        .setTitle('NOTIFICAÇÃO DE INATIVAÇÃO')
        .setColor('#00000F') // preto
        .setURL('https://phonevox.com.br')
        .setTimestamp()
    },
    error: () => {
        return new MessageBuilder()
        .setTitle('DEBUG')
        .setColor('#FF00FF') // rosa/roxo
        .setURL('https://phonevox.com.br')
        .setTimestamp();
        // .setThumbnail('');
    },
    test: () => {
        return new MessageBuilder()
        .setTitle('DEBUG')
        .setColor('#0000FF') // rosa/roxo
        .setURL('https://phonevox.com.br')
        .setTimestamp();
    }
}

module.exports = {
    key: 'DiscordMessage',
    async handle(job, done, Queue) {
        const log = generateLogger(`${LOG_NAME}:${job.id}`, path.resolve(LOG_LOCATION), LOG_LEVEL, LOG_FILE_LEVEL, LOG_FILE_ROTATE);
        let embed

        const hook = new Webhook(process.env.DISCORD_WEBHOOK);

        embed = messages.test();

        hook.send(embed);

        // gerar o hook
        // escolher a template correta de mensagem
        // * se for um erro, confirmar se será enviado pro hook principal ou secundário
        // preencher as informações do cliente na request
        // enviar a mensagem
        job.progress(100);
        done();
    }
}
