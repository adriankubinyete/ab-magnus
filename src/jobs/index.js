const path = require("path");
module.exports = {
    ListMagnusClients: require(path.resolve("src/jobs/ListMagnusClients")),
    SearchContracts: require(path.resolve("src/jobs/SearchContracts")),
    EnableClient: require(path.resolve("src/jobs/EnableClient")),
    BlockClient: require(path.resolve("src/jobs/BlockClient"))
}
