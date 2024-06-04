const path = require("path");
module.exports = {
    ListMagnusClients: require(path.resolve("src/jobs/ListMagnusClients")),
    SearchContracts: require(path.resolve("src/jobs/SearchContracts"))
}
