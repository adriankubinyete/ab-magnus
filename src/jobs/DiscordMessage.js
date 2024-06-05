const path = require("path");
const { generateLogger } = require( path.resolve("src/util/logging") )

let LOG_NAME = "p:EnableClient"
let LOG_LOCATION = "logs/app"
let LOG_LEVEL = 10
let LOG_FILE_LEVEL = 10
let LOG_FILE_ROTATE = "30d"

module.exports = {
    key: 'DiscordMessage',
    async handle(job, done, Queue) {
        const log = generateLogger(`${LOG_NAME}:${job.id}`, path.resolve(LOG_LOCATION), LOG_LEVEL, LOG_FILE_LEVEL, LOG_FILE_ROTATE);
    }
}
