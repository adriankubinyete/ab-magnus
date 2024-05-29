const path = require("path");
const { createHash } = require("crypto");
const { MagnusBilling } = require( path.resolve("src/lib/magnusbilling-node/index") );

function getMagnusBillingClient() {
    let MAGNUSBILLING_URL=`${process.env.MAGNUSBILLING_PROTOCOL}://${process.env.MAGNUSBILLING_HOST}:${process.env.MAGNUSBILLING_PORT}/mbilling`
    return new MagnusBilling(process.env.MAGNUSBILLING_API_KEY, process.env.MAGNUSBILLING_API_SECRET, MAGNUSBILLING_URL);
}

function sha256(x, y = {digest: hex}) {
    let hash = createHash('sha256').update(x);
    switch (y.digest) {
        case "hex":
            return hash.digest('hex');
        case "base64":
            return hash.digest('base64');
        default:
            throw new Error("Unknown digest");
    }
}

module.exports = {
    getMagnusBillingClient,
    sha256
}
