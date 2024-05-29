// npm install winston
const winston = require('winston');
const DailyRotateFile = require('winston-daily-rotate-file');

// CRITICAL : algo essencial não vai funcionar.
// ERROR    : algo relativamente inesperado ocorreu.
// WARN     : algo pode dar errado.
// INFO     : informativo.
// DEBUG    : informações extras / exageradas.
// TRACE    : mais profundo que um debug.
// UNIT     : Teste de unidade. conferir valor de variável, true/falses básicos, etc.

const generateLogger = (logName, logfileLocation, consoleLogLevel = 'debug', fileLogLevel = 'debug', logfileRotate) => {
    const levels = { critical: 0, error: 1, warn: 2, info: 3, debug: 4, trace: 5, unit: 6 };
    const colors = { critical: 'bold red blackBG', error: 'red', warn: 'yellow', info: 'green', debug: 'blue', trace: 'cyan', unit: 'cyan whiteBG' };
    const systemTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;

    winston.addColors(colors);

    // console.log('Criando o ' + logName + ' para salvar em ' + logfileLocation + ', com o filtro ' + consoleLogLevel + ' e a TimeZone: ' + systemTimeZone)

    // Função para validar se uma string representa um nível de log válido
    const isValidLogLevelString = (str) => {
        if (!(typeof(str) === 'string')) { return } // Não é uma string
        const lowercaseStr = str.toLowerCase();
        return levels.hasOwnProperty(lowercaseStr);
    };

    // Se a string for válida, converte para número usando o objeto levels, caso contrário, usa como está
    const numericLogLevel = isValidLogLevelString(consoleLogLevel) ? levels[consoleLogLevel.toLowerCase()] : parseInt(consoleLogLevel, 10);
    const numericLogfileLevel =  isValidLogLevelString(fileLogLevel) ? levels[fileLogLevel.toLowerCase()] : parseInt(fileLogLevel, 10);

    // Filtra os níveis com base no consoleLogLevel
    const filteredLevels = Object.keys(levels).filter(level => levels[level] <= numericLogLevel);
    const transports = [];

    if (filteredLevels.length > 0) {
        const consoleTransport = new winston.transports.Console({
            format: winston.format.combine(
                winston.format.colorize({ all: true }),
                winston.format.label({ label: logName }),
                winston.format.timestamp({ format: 'DD/MM/YYYY HH:mm:ss.SSSSSS', tz: systemTimeZone }),
                winston.format.printf(({ level, message, label, timestamp }) => {
                    return `[${timestamp}] [${level}] ${label}: ${message}`;
                }),
            ),
        });

        // Configuração de níveis para o transporte do console
        consoleTransport.level = filteredLevels[filteredLevels.length - 1];

        transports.push(consoleTransport);
    }

    if (numericLogLevel >= numericLogfileLevel) {
        const fileTransport = new DailyRotateFile({
            filename: `${logfileLocation}-%DATE%.log`,
            datePattern: 'YYYY-MM-DD',
            zippedArchive: true,
            maxSize: '20m',
            maxFiles: logfileRotate,
            format: winston.format.combine(
                winston.format.label({ label: logName }),
                winston.format.timestamp({ format: 'DD/MM/YYYY HH:mm:ss.SSSSSS', tz: systemTimeZone }),
                winston.format.printf(({ level, message, label, timestamp }) => {
                    return `[${timestamp}] [${level}] ${label}: ${message}`;
                }),
            ),
        });

        // Configuração de níveis para o transporte do arquivo
        fileTransport.level = filteredLevels[numericLogfileLevel];

        transports.push(fileTransport);
    }

    return winston.createLogger({
        levels: levels,
        transports: transports,
    });
}

module.exports = {
    generateLogger
}