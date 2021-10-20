const path = require('path')
const fs = require('fs');
const HDWalletProvider = require("@truffle/hdwallet-provider");

let secrets = JSON.parse(fs.readFileSync('./secrets.json'));

module.exports = {
    // See <http://truffleframework.com/docs/advanced/configuration>
    // to customize your Truffle configuration!
    contracts_build_directory: path.join(__dirname, "vapp/src/contracts"),

    networks: {

        pl: { //poligon  local fork
            host: "127.0.0.1",
            port: 8555,
            network_id: "137"
        },
        polygon: {
            provider: function() {
                return new HDWalletProvider(
                    secrets.polygon.pk,
                    secrets.polygon.polygon_public_gateway,
                    // secrets.polygon.wss_polygon_public_gateway,
                    // secrets.polygon.infura
                )
            },
            network_id: 137,
            gasPrice: 40000000000,
            networkCheckTimeout: 1000000000,
            timeoutBlocks: 200,
            skipDryRun: true,
        },
        pl_pr: {
            provider: function() {
                return new HDWalletProvider(
                    secrets.polygon.pk,
                    "http://127.0.0.1:8555"
                )
            },
            network_id: 137,
            gasPrice: 40000000000,
            networkCheckTimeout: 1000000000,
            timeoutBlocks: 200,
            skipDryRun: true,
        },


    },

    compilers: {
        solc: {
            version: "0.8.6"
        }
    },

};
