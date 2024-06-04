const path = require("path");
const { generateLogger } = require( path.resolve("src/util/logging") )
const { getMagnusBillingClient } = require( path.resolve("src/util/Utils") )

let LOG_NAME = "p:BlockClient"
let LOG_LOCATION = "logs/app"
let LOG_LEVEL = 10
let LOG_FILE_LEVEL = 10
let LOG_FILE_ROTATE = "30d"

module.exports = {
    key: 'BlockClient',
    async handle(job, done, Queue) {
        const log = generateLogger(`${MAG_LOG_NAME}:${job.id}`, path.resolve(MAG_LOG_LOCATION), MAG_LOG_LEVEL, MAG_LOG_FILE_LEVEL, MAG_LOG_FILE_ROTATE);

        let mb = getMagnusBillingClient();

        if(job.progress()>=100) {
            done(null, {})
        }
    }
}
