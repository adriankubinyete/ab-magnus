// npm install winston
const winston = require('winston');
const path = require('path');
const DailyRotateFile = require('winston-daily-rotate-file');

class Logger {
    constructor(debug = false) {

        this.NAME = undefined;
        this.LOCATION = undefined;
        this.CONSOLE_LEVEL = 'debug';
        this.FILE_LEVEL = 'debug';
        this.ROTATE = '30d';
        this.WINSTON_LOG = undefined;
        this.DEBUG_MODE = debug;
        this.LEVELS = {
            critical: {
                level: 0,
                color: "bold red blackBG"
            },
            error: {
                level: 1,
                color: "red"
            },
            warn: {
                level: 2,
                color: "yellow"
            },
            info: {
                level: 3,
                color: "green"
            },
            debug: {
                level: 4,
                color: "blue"
            },
            trace: {
                level: 5,
                color: "cyan"
            },
            unit: {
                level: 6,
                color: "bold cyan"
            },
        }

        // Adiciona métodos dinâmicos para cada nível de log
        this.addLogMethods();

    }

    // Main

    create() {
        const isValidLogLevelString = (str, levels) => {
            if (!(typeof(str) === 'string')) { return }
            const lowercaseStr = str.toLowerCase();
            return levels.hasOwnProperty(lowercaseStr);
        };

        const systemTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
        const LEVELS = this.getLevels()
        
        winston.addColors(this.getColors());

        // Se a string for válida, converte para número usando o objeto levels, caso contrário, usa como está
        const numericLogLevel = isValidLogLevelString(this.CONSOLE_LEVEL, LEVELS) ? LEVELS[this.CONSOLE_LEVEL.toLowerCase()] : parseInt(this.CONSOLE_LEVEL, 10);
        const numericLogfileLevel =  isValidLogLevelString(this.FILE_LEVEL, LEVELS) ? LEVELS[this.FILE_LEVEL.toLowerCase()] : parseInt(this.FILE_LEVEL, 10);

        // Filtra os níveis com base no consoleLogLevel
        const filteredLevels = Object.keys(LEVELS).filter(level => LEVELS[level] <= numericLogLevel);
        const transports = [];

        if (filteredLevels.length > 0) {
            const consoleTransport = new winston.transports.Console({
                format: winston.format.combine(
                    winston.format.colorize({ all: true }),
                    winston.format.label({ label: this.NAME }),
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
                filename: `${this.LOCATION}-%DATE%.log`,
                datePattern: 'YYYYMMDD',
                zippedArchive: true,
                maxSize: '20m',
                maxFiles: this.ROTATE,
                format: winston.format.combine(
                    winston.format.label({ label: this.NAME }),
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
    
        this.WINSTON_LOG = winston.createLogger({
            levels: LEVELS,
            transports: transports,
        });

        return this;

    }
 
    addLogMethods() {
        Object.keys(this.LEVELS).forEach(level => {
            this[level] = (message) => {
                if (this.WINSTON_LOG) {
                    this.WINSTON_LOG[level](message);
                } else {
                    console.error('Winston logger is not defined');
                }
            };
        });
    }

    // Getters
    
    get() {
        return this.WINSTON_LOG;
    }

    getColors() {
        const colors = {};
        for (const key in this.LEVELS) {
            if (this.LEVELS.hasOwnProperty(key)) {
                colors[key] = this.LEVELS[key].color
            }
        }
        
        if (this.DEBUG_MODE) {
            console.log("Transforming LEVELS array to COLORS for Winston.")
            console.log(this.LEVELS)
            console.log("Returned: " + JSON.stringify(colors))
        }

        return colors;
    }

    getLevels() {
        const levels = {};

        for (const key in this.LEVELS) {
            if (this.LEVELS.hasOwnProperty(key)) {
                levels[key] = this.LEVELS[key].level;
            }
        }
        
        return levels;

    }
    
    // Setters

    setName(name) {
        this.NAME = name;
        return this;
    }

    setLocation(location) {
        this.LOCATION = path.resolve(location);
        return this;
    }

    setConsoleLevel(clvl) {
        this.CONSOLE_LEVEL = clvl;
        return this;
    }

    setFileLevel(flvl) {
        this.FILE_LEVEL = flvl;
        return this;
    }

    setLevel(lvl) {
        this.CONSOLE_LEVEL = lvl;
        this.FILE_LEVEL = lvl;
        return this;
    }

    setRotate(rotate) {
        this.ROTATE = rotate;
        return this;
    }
}

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
    generateLogger,
    Logger
}