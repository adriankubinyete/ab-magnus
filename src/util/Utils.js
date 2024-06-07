const path = require("path");
const axios = require("axios");
const { createHash } = require("crypto");
const { MagnusBilling } = require( path.resolve("src/lib/magnusbilling-node/index") );
const { generateLogger } = require(path.resolve("src/util/logging"));

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
function formatDiscordMessage(template, data) {
    let LOG_NAME = "formatDiscordMessage"
    let LOG_LOCATION = "logs/app"
    let LOG_LEVEL = 10
    let LOG_FILE_LEVEL = 10
    let LOG_FILE_ROTATE = "30d"
    const log = generateLogger(LOG_NAME, path.resolve(LOG_LOCATION), LOG_LEVEL, LOG_FILE_LEVEL, LOG_FILE_ROTATE)
    
    return template.replace(/\\?%\w+%/g, (match) => {
        if (match.startsWith('\\')) {
            // Remove a barra invertida e retorna o caractere %
            return match.slice(1);
        }

        const key = match.slice(1, -1); // Remove % do início e do final
        log.unit(`O valor mapeado para ${match} é "${data[key]}" (${typeof(data[key])}).`)
        if (data[key] !== undefined) { 
            log.trace(`${match} : Substituição efetuada: "${data[key]}"`)
            return data[key] 
        } else { 
            log.warn(`${match} : Variável de substituição não-mapeada, ou com valor indefinido.`)
            return match 
        }
    });
}

// TODO:
// Organizar isso aqui em outro local?
async function obtainNewJWT() {
    let LOG_NAME = "obtainNewJWT"
    let LOG_LOCATION = "logs/app"
    let LOG_LEVEL = 10
    let LOG_FILE_LEVEL = 10
    let LOG_FILE_ROTATE = "30d"
    const log = generateLogger(LOG_NAME, path.resolve(LOG_LOCATION), LOG_LEVEL, LOG_FILE_LEVEL, LOG_FILE_ROTATE)

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
    log.debug(`[JWT_REQUEST] Obtendo novo JWT`)
    log.debug('[JWT_REQUEST] ' + JSON.stringify(JWT_REQ))
    let res = await axios.request(JWT_REQ)

    // Analisando o resultado pra ver se foi sucesso
    if (!res.status === 200) {
        log.error('[JWT_REQUEST] FAIL: Parece que não foi possível obter um JSON WEB TOKEN, o status da requisição está diferente do esperado: ' + JSON.stringify(res));
        return false
    }

    // Deu certo, agora seto esse JSON como disponível.
    log.debug("[JWT_REQUEST] SUCCESS: JSON Web Token obtido: " + res.data.token);
    process.env.JSON_WEB_TOKEN = res.data.token;
    return true
}

// TODO:
// Organizar isso aqui em outro local?
async function sendRequestABS(AXIOS_REQUEST_PARAMS, isJwtRetry = false) {
    let LOG_NAME = "sendRequestABS"
    let LOG_LOCATION = "logs/app"
    let LOG_LEVEL = 10
    let LOG_FILE_LEVEL = 10
    let LOG_FILE_ROTATE = "30d"
    const log = generateLogger(LOG_NAME, path.resolve(LOG_LOCATION), LOG_LEVEL, LOG_FILE_LEVEL, LOG_FILE_ROTATE)

    // Verificando se é necessário gerar um JWT novo
    if (!process.env.JSON_WEB_TOKEN | isJwtRetry) { await obtainNewJWT() }

    // Atualizando nos headers
    if (AXIOS_REQUEST_PARAMS.headers) { // se tem header, preciso preservá-lo
        AXIOS_REQUEST_PARAMS.headers.Authorization = process.env.JSON_WEB_TOKEN
    } else { // não tem o objeto de headers criado. Crio um e adiciono auth
        AXIOS_REQUEST_PARAMS.headers = { Authorization: process.env.JSON_WEB_TOKEN }
    }

    // DEBUG: manualmente atrapalhando o JWT pra simular um jwt expirado
    // if (!isJwtRetry) { AXIOS_REQUEST_PARAMS.headers.Authorization = 'w' }

    // Envia a requisição e retorna TUDO, completamente
    let res // inicializando a variável que vai segurar a resposta
    try {
        res = await axios.request(AXIOS_REQUEST_PARAMS)
    } catch (err) {

        // Analisando o erro: se for por causa de JWT
        if (err.response.status === 401) {
            log.warn(`[${err.response.status}] [${err.response.statusText}] Requisição falhou, aparentemente por JWT Inválido.`)
            if (!isJwtRetry) { // se for um jwtRetry, eu não posso enviar denovo, pq se não só looparia.
                log.debug('Tentando re-enviar a requisição...')
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

module.exports = {
    getMagnusBillingClient,
    sha256,
    obtainNewJWT,
    sendRequestABS,
    formatDiscordMessage
}
