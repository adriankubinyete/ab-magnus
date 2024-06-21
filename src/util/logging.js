const winston = require('winston');
const path = require('path');
const DailyRotateFile = require('winston-daily-rotate-file');

class Logger {
    constructor(name = undefined, debug = false) {

        this.NAME = name;
        this.LOCATION = undefined;
        this.CONSOLE_LEVEL = 'info';
        this.FILE_LEVEL = 'info';
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
                color: "bold green"
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

        // CRITICAL : Erros graves, que impossibilitam a execução, ou há perda de dados importantes.
        // ERROR    : Erros que exigem atenção imediata, mas não interrompem a execução do sistema.
        // WARN     : Erro não-direto, mas que pode causar problemas. Avisos.
        // INFO     : Eventos úteis, que não indicam problema, apenas para auditoria.
        // DEBUG    : Informações úteis à depuração.
        // TRACE    : Informações detalhadas à nível granular. Execução passo-a-passo.
        // UNIT     : Específicos, testes unitários.

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
                filename: `${this.LOCATION}`,
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
                    if (this.JOB) {
                        this.JOB.log(message);
                    }
                } else {
                    console.error('Winston logger is not defined');
                }
            };
        });
    }

    useEnvConfig() {
        if (this.DEBUG_MODE) {
            console.log(`Logger: Tentando utilizar as variáveis de ambiente:`)
            console.log("LOG_NAME" + process.env.LOG_NAME)
            console.log("LOG_LOCATION" + process.env.LOG_LOCATION)
            console.log("LOG_CONSOLE_LEVEL" + process.env.LOG_CONSOLE_LEVEL)
            console.log("LOG_FILE_LEVEL" + process.env.LOG_FILE_LEVEL)
            console.log("LOG_ROTATE_PERIOD" + process.env.LOG_ROTATE_PERIOD)
            console.log("LOG_DEBUG_MODE" + process.env.LOG_DEBUG_MODE)
        }

        this.NAME = process.env.LOG_NAME ?? this.NAME;
        this.LOCATION = process.env.LOG_LOCATION ?? this.LOCATION;
        this.CONSOLE_LEVEL = process.env.LOG_CONSOLE_LEVEL ?? this.CONSOLE_LEVEL;
        this.FILE_LEVEL = process.env.LOG_FILE_LEVEL ?? this.FILE_LEVEL;
        this.ROTATE = process.env.LOG_ROTATE_PERIOD ?? this.ROTATE;
        this.DEBUG_MODE = JSON.parse(process.env.LOG_DEBUG_MODE) ?? this.DEBUG_MODE;

        return this;
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

    setJob(job) {
        this.JOB = job;
        return this;
    }

}

module.exports = {
    Logger
}
