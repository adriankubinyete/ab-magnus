require("dotenv").config();
const path = require("path")
const { Logger } = require(path.resolve("src/util/logging"));
const log = new Logger('TEST_LOG', false).useEnvConfig().create()

log.critical('teste')
log.error('teste')
log.warn('teste')
log.info('teste')
log.debug('teste')
log.trace('teste')
log.unit('teste')