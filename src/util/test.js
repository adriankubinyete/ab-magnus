const path = require("path")
const { Logger } = require(path.resolve("src/util/logging"));

const log = new Logger(true).setName('TEST_LOG').setLevel('unit').setLocation('./').addLevel({"special": {level: 0, color: "cyan blackBG"}}).create()
log.special('test')
log.critical('teste')
log.error('teste')
log.warn('teste')
log.info('teste')
log.debug('teste')
log.trace('teste')
log.unit('teste')