const path = require("path");
module.exports = {
    ListMagnusClients: require(path.resolve("src/jobs/ListMagnusClients")),
    SearchContracts: require(path.resolve("src/jobs/SearchContracts")),
    EnableClient: require(path.resolve("src/jobs/EnableClient")),
    DisableClient: require(path.resolve("src/jobs/DisableClient")),
    BlockClient: require(path.resolve("src/jobs/BlockClient")),
    UnblockClient: require(path.resolve("src/jobs/UnblockClient")),
    DiscordMessage: require(path.resolve("src/jobs/DiscordMessage"))
}
