const path = require("path");
const axios = require("axios");
const { createHash } = require("crypto");
const { MagnusBilling } = require( path.resolve("src/lib/magnusbilling-node/index") );
const { Logger } = require( path.resolve("src/util/logging") );
const { bombGame } = require( path.resolve("src/util/Game"));

function getMagnusBillingClient() {
    let MAGNUSBILLING_URL=`${process.env.MAGNUSBILLING_PROTOCOL}://${process.env.MAGNUSBILLING_HOST}:${process.env.MAGNUSBILLING_PORT}/mbilling`
    return new MagnusBilling(process.env.MAGNUSBILLING_API_KEY, process.env.MAGNUSBILLING_API_SECRET, MAGNUSBILLING_URL);
}

function sha256(x, y = {digest: hex}) {
    let hash = createHash('sha256').update(x);
    switch (y.digest) {
        case "hex":
            return hash.digest('hex');
        case "base64":
            return hash.digest('base64');
        default:
            throw new Error("Unknown digest");
    }
}

// Formatar a mensagem do discord
// formatDiscordMessage(msg, {fake_var: replaced_var...})
function formatDiscordMessage(log, message, varMapping) {
    varMapping.game = bombGame() // easter egg
    
    return message.replace(/\\?%\w+%/g, (match) => {
        if (match.startsWith('\\')) {
            // Remove a barra invertida e retorna o caractere %
            return match.slice(1);
        }

        const key = match.slice(1, -1); // Remove % do início e do final
        log.unit(`O valor mapeado para ${match} é "${varMapping[key]}" (${typeof(varMapping[key])}).`)
        if (varMapping[key] !== undefined) { 
            log.trace(`${match} : Substituição efetuada: "${varMapping[key]}"`)
            return varMapping[key] 
        } else { 
            log.warn(`${match} : Variável de substituição não-mapeada, ou com valor indefinido.`)
            return match 
        }
    });
}

// TODO:
// Organizar isso aqui em outro local?
async function obtainNewJWT() {
    let LOG_NAME = "ObtainNewJWT"
    const log = new Logger(LOG_NAME, false).useEnvConfig().create()

    // Requisitando o JWT
    let JWT_AUTH_ENDPOINT = '/auth'
    let JWT_REQ = {
        method: 'post',
        url: `${process.env.AUTOBLOCKERSERVER_PROTOCOL}://${process.env.AUTOBLOCKERSERVER_HOST}:${process.env.AUTOBLOCKERSERVER_PORT}` + JWT_AUTH_ENDPOINT,
        data: {
            "user": process.env.AUTOBLOCKERSERVER_USER,
            "password": process.env.AUTOBLOCKERSERVER_PASSWORD,
        }
    }
    log.unit(`Obtendo novo JWT`)
    log.unit(JSON.stringify(JWT_REQ))
    let res = await axios.request(JWT_REQ)

    // Analisando o resultado pra ver se foi sucesso
    if (!res.status === 200) {
        log.error('FAIL: Parece que não foi possível obter um JSON WEB TOKEN, o status da requisição está diferente do esperado: ' + JSON.stringify(res));
        return false
    }

    // Deu certo, agora seto esse JSON como disponível.
    log.trace("SUCCESS: JSON Web Token obtido: " + res.data.token);
    process.env.JSON_WEB_TOKEN = res.data.token;
    return true
}

// TODO:
// Organizar isso aqui em outro local?
async function sendRequestABS(AXIOS_REQUEST_PARAMS, isJwtRetry = false) {
    let LOG_NAME = "SendRequestABS"
    const log = new Logger(LOG_NAME, false).useEnvConfig().create()

    // Verificando se é necessário gerar um JWT novo
    if (!process.env.JSON_WEB_TOKEN | isJwtRetry) { await obtainNewJWT() }

    // Atualizando nos headers
    if (AXIOS_REQUEST_PARAMS.headers) { // se tem header, preciso preservá-lo
        AXIOS_REQUEST_PARAMS.headers.Authorization = process.env.JSON_WEB_TOKEN
    } else { // não tem o objeto de headers criado. Crio um e adiciono auth
        AXIOS_REQUEST_PARAMS.headers = { Authorization: process.env.JSON_WEB_TOKEN }
    }

    // Envia a requisição e retorna TUDO, completamente
    let res // inicializando a variável que vai segurar a resposta
    try {
        res = await axios.request(AXIOS_REQUEST_PARAMS)
    } catch (err) {
        console.log('deu erro enviando a req pro abs')
        console.log(err)
        // Analisando o erro: se for por causa de JWT
        if (err.response.status === 401) {
            log.warn(`[${err.response.status}] [${err.response.statusText}] Requisição falhou, possivelmente por JWT Inválido.`)
            if (!isJwtRetry) { // se for um jwtRetry, eu não posso enviar denovo, pq se não só looparia.
                log.unit('Tentando re-enviar a requisição...')
                return await sendRequestABS(AXIOS_REQUEST_PARAMS, true)
            }
        }

        throw err
    }

    if (res.status === 204) {
        log.warn(`${JSON.stringify(AXIOS_REQUEST_PARAMS)} : Sem resultados!`)
    }
    return res.data
}

function envBool(param) {
    return (String(param).toLowerCase() === 'true');
}

module.exports = {
    getMagnusBillingClient,
    sha256,
    obtainNewJWT,
    sendRequestABS,
    formatDiscordMessage,
    envBool
}
