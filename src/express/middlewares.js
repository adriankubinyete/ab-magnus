const rateLimit = require('express-rate-limit');

const AUTH_RATELIMIT_WINDOW_MINUTES  = 15 // minutos
const AUTH_MAX_REQUESTS_PER_WINDOW   = 999
const ROUTE_RATELIMIT_WINDOW_MINUTES = 15 // minutos
const ROUTE_MAX_REQUESTS_PER_WINDOW  = 999

const ratelimit_auth = rateLimit({
    windowsMs: AUTH_RATELIMIT_WINDOW_MINUTES * 60 * 1000, // 15 minutos
    max: AUTH_MAX_REQUESTS_PER_WINDOW, // Número máximo de solicitações permitidas dentro do intervalo
    message: 'Muitas solicitações a partir deste IP. Por favor, tente novamente mais tarde.',
    handler: (req, res) => {
        res.status(429).json({ message: 'Limite de taxa excedido. Por favor, tente novamente mais tarde.' });
    },
});


const ratelimit_route = rateLimit({
    windowsMs: ROUTE_RATELIMIT_WINDOW_MINUTES * 60 * 1000, // 15 minutos
    max: ROUTE_MAX_REQUESTS_PER_WINDOW, // Número máximo de solicitações permitidas dentro do intervalo
    message: 'Muitas solicitações a partir deste IP. Por favor, tente novamente mais tarde.',
    handler: (req, res) => {
        res.status(429).json({ message: 'Limite de taxa excedido. Por favor, tente novamente mais tarde.' });
    },
});

// Obter o IP do cliente
function getClientIp(req) {
    const ip = req.ip.includes('::ffff:') ? req.ip.split(':')[3] : req.ip;
    return ip;
}

// Middleware genérico para checagens
const performChecks = (req, res, next) => {
    try {
        next();
    } catch (error) {
        res.status(400).json({ error: 'Falha nas verificações. Verifique os dados da requisição.' });
    }
};

const setLogPrefix = (req, res, next) => {
    req.clientIp = getClientIp(req)
    req.logPrefix = `[${req.clientIp}] [${req.originalUrl || req.url}]`
    next()
};


// Parâmetros esperados na requisição
const expects = (parametrosObrigatorios) => {
    return (req, res, next) => {
        console.log(`${req.originalUrl || req.url} - Validando parâmetros ${parametrosObrigatorios}`)
        const parametrosFaltando = [];
        
        // Verifica se todos os parâmetros obrigatórios estão presentes no corpo da requisição
        for (const parametro of parametrosObrigatorios) {
            if (!(parametro in req.body)) {
                parametrosFaltando.push(parametro);
            }
        }
        
        // Se houver parâmetros faltando, retorna um erro 401 com uma mensagem indicando quais parâmetros estão faltando
        if (parametrosFaltando.length > 0) {
            return res.status(401).json({ status: 'error', error: `Parâmetros faltando: ${parametrosFaltando.join(', ')}` });
        }
        
        // Se todos os parâmetros obrigatórios estiverem presentes, passa para o próximo middleware ou rota
        next();
    };
};

module.exports = {
    performChecks,
    expects,
    setLogPrefix,
    ratelimit_route,
    ratelimit_auth,
}