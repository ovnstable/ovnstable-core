const path = require('path')
const fs = require('fs');
const HDWalletProvider = require("@truffle/hdwallet-provider");

// let secrets = JSON.parse(fs.readFileSync('./secrets.json'));

module.exports = {
    // See <http://truffleframework.com/docs/advanced/configuration>
    // to customize your Truffle configuration!
    contracts_build_directory: path.join(__dirname, "vapp/src/contracts"),

    networks: {
        development: {
            host: "127.0.0.1",
            port: 8545,
            network_id: "*"
        },
        ml: { //mumbai local
            host: "127.0.0.1",
            port: 8555,
            network_id: "80001"
        }, /* // fork from Mumbai testnnet, needs start ganache as
rm -r ../ganache_mumbai && ganache-cli -m "clutch captain shoe salt awake harvest setup primary inmate ugly among become" -f 'https://polygon-mumbai.infura.io/v3/753a98a2eb6c4d64918829f47d069440' -u 0xa0df350d2637096571F7A701CBc1C5fdE30dF76A --db ../ganache_mumbai  -p 8555 -g 20 -e 1000

     */

        pl: { //poligon  local fork
            host: "127.0.0.1",
            port: 8555,
            network_id: "137"
        }, /* // fork from Polygon mainnet, needs start ganache as
rm -r ../ganache_poly && ganache-cli -m "clutch captain shoe salt awake harvest setup primary inmate ugly among become" -f 'https://polygon-mainnet.infura.io/v3/753a98a2eb6c4d64918829f47d069440' -u 0xa0df350d2637096571F7A701CBc1C5fdE30dF76A --db ../ganache_poly  -p 8555 -g 20 -e 1000

 */
        dev: { //ONV testnet
            host: "https://ovnstable.io/ganache-test",
            port: 8555,
            network_id: "137"
        },

        kovan: {
            provider: function() {
                return new HDWalletProvider(
                    //private keys array
                    [privateKey],
                    //url to ethereum node
                    "https://kovan.infura.io/v3/66f5eb50848f458cb0f0506cc1036fea"
                )
            },
            network_id: 42
        },

        polygon: {
            provider: function() {
                return new HDWalletProvider(
                    secrets.polygon.pk,
                    secrets.polygon.infura
                )
            },
            network_id: 137,
            gasPrice: 15000000000,
            networkCheckTimeout: 1000000000,
        },

        mumbai: {
            provider: function() {
                return new HDWalletProvider(
                    //private keys array
                    [privateKey],
                    //url to ethereum node
                    "https://polygon-mumbai.infura.io/v3/66f5eb50848f458cb0f0506cc1036fea"
                )
            },
            gas: 6721975,
            gasPrice: 5000000000,
            confirmations: 2,    // # of confs to wait between deployments. (default: 0)
            timeoutBlocks: 50,  // # of blocks before a deployment times out  (minimum/default: 50)
            skipDryRun: true,     // Skip dry run before migrations? (default: false for public nets )
            network_id: 80001
        },

        ropsten: {
            provider: function() {
                return new HDWalletProvider(
                    //private keys array
                    [privateKey],
                    //url to ethereum node
                    "https://ropsten.infura.io/v3/66f5eb50848f458cb0f0506cc1036fea"
                )
            },
            gas: 6721975,
            gasPrice: 20000000000,
            confirmations: 2,    // # of confs to wait between deployments. (default: 0)
            timeoutBlocks: 200,  // # of blocks before a deployment times out  (minimum/default: 50)
            skipDryRun: true,     // Skip dry run before migrations? (default: false for public nets )
            network_id: 3
        }

    },

    compilers: {
        solc: {
            version: "0.8.6"
        }
    },

};
