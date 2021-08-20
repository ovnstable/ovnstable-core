const path = require('path')
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

        pl: { //mumbai local
            host: "127.0.0.1",
            port: 8555,
            network_id: "137"
        }, /* // fork from Polygon mainnet, needs start ganache as
rm -r ../ganache_poly && ganache-cli -m "clutch captain shoe salt awake harvest setup primary inmate ugly among become" -f 'https://polygon-mainnet.infura.io/v3/753a98a2eb6c4d64918829f47d069440' -u 0xa0df350d2637096571F7A701CBc1C5fdE30dF76A --db ../ganache_poly  -p 8555 -g 20 -e 1000

 */
        dev: { //mumbai local
            host: "https://ovnstable.io/ganache-test",
            port: 8555,
            network_id: "137"
        }

    },

    compilers: {
        solc: {
            version: "0.8.6"
        }
    },

};
