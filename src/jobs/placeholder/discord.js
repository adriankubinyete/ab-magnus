const path = require("path");
const { Webhook, MessageBuilder } = require('discord-webhook-node');
const { generateLogger } = require( path.resolve("src/util/logging") )
const { getMagnusBillingClient } = require( path.resolve("src/util/Utils") )

const mainHook = new Webhook(process.env.DISCORD_WEBHOOK);

let DISCORD_LOG_NAME = "proc:discord"
let DISCORD_LOG_LOCATION = "logs/app"
let DISCORD_LOG_LEVEL = 10
let DISCORD_LOG_FILE_LEVEL = 10
let DISCORD_LOG_FILE_ROTATE = "30d"

// EMBED TEMPLATES

function templateEmbBlock() {
    return new MessageBuilder()
    .setTitle('NOTIFICAÇÃO DE BLOQUEIO')
    .setColor('#FF0000') // vermelho
    .setURL('https://phonevox.com.br')
    .setTimestamp()
    .setThumbnail('https://em-content.zobj.net/source/twitter/103/lock_1f512.png');
}

function templateEmbUnblock() {
    return new MessageBuilder()
    .setTitle('NOTIFICAÇÃO DE DESBLOQUEIO')
    .setColor('#00FF00') // verde
    .setURL('https://phonevox.com.br')
    .setTimestamp()
    .setThumbnail('https://static-00.iconduck.com/assets.00/open-lock-emoji-370x512-vszsnxmi.png');
}

function templateEmbEnable() {
    return new MessageBuilder()
    .setTitle('NOTIFICAÇÃO DE ATIVAÇÃO')
    .setColor('#00FF00') // ciano (SIM, CIANO LEONARDO, CIANO!)
    .setURL('https://phonevox.com.br')
    .setTimestamp()
    .setThumbnail('https://em-content.zobj.net/source/facebook/355/check-mark-button_2705.png');
}

function templateEmbDisable() {
    return new MessageBuilder()
    .setTitle('NOTIFICAÇÃO DE DESATIVAÇÃO')
    .setColor('#660000') // cinza
    .setURL('https://phonevox.com.br')
    .setTimestamp()
    .setThumbnail('https://em-content.zobj.net/source/facebook/355/cross-mark-button_274e.png');
}

function templateEmbError() {
    return new MessageBuilder()
    .setTitle('DEBUG')
    .setColor('#FF00FF') // roxo
    .setURL('https://phonevox.com.br')
    .setTimestamp();
    // .setThumbnail('');
}

const log = generateLogger(DISCORD_LOG_NAME, path.resolve(DISCORD_LOG_LOCATION), DISCORD_LOG_LEVEL, DISCORD_LOG_FILE_LEVEL, DISCORD_LOG_FILE_ROTATE);

module.exports = (dqNotify) => {

    dqNotify.process(1, async(job, done) => {
        const qlog = generateLogger(`BLOCK:${job.id}`, path.resolve(DISCORD_LOG_LOCATION), DISCORD_LOG_LEVEL, DISCORD_LOG_FILE_LEVEL, DISCORD_LOG_FILE_ROTATE);
        qlog.debug(`Starting job "${job.id}"`);

        setTimeout(() => {
            qlog.debug('done')
            done(null, {})
        }, 5000);
    })

    log.info("Processor for discord.js registered successfully");
}
