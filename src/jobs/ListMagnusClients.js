const path = require("path");
const { generateLogger } = require( path.resolve("src/util/logging") )
const { getMagnusBillingClient } = require( path.resolve("src/util/Utils") )

let MAG_LOG_NAME = "proc:magnus"
let MAG_LOG_LOCATION = "logs/app"
let MAG_LOG_LEVEL = 10
let MAG_LOG_FILE_LEVEL = 10
let MAG_LOG_FILE_ROTATE = "30d"

const log = generateLogger(MAG_LOG_NAME, path.resolve(MAG_LOG_LOCATION), MAG_LOG_LEVEL, MAG_LOG_FILE_LEVEL, MAG_LOG_FILE_ROTATE);

module.exports = {
    key: 'ListMagnusClients',
    async handle({ data }) {
        console.log(data)
        console.log('ListMagnusClients called')
    }
}