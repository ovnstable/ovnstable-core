const path = require('path');
const HDWalletProvider = require("@truffle/hdwallet-provider");
const pk = require("../pk.json");

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
    mumbai: {
      provider: () => new HDWalletProvider({
          privateKeys: pk["80001"]["pk"],
          providerOrUrl:  pk["80001"]["infkey"]
        }),
          network_id: 80001
      // https://ropsten.infura.io/v3/753a98a2eb6c4d64918829f47d069440", // Endpoint of an node to connect to. Can be on localhost or on the internet
      },

  devpk: {
    provider: () => new HDWalletProvider({
        privateKeys: pk["999"]["pk"],
        providerOrUrl: `http://localhost:8545`}),
        network_id: 999
    // https://ropsten.infura.io/v3/753a98a2eb6c4d64918829f47d069440", // Endpoint of an node to connect to. Can be on localhost or on the internet
    },
},
  compilers: {
    solc: {
      version: "^0.8.0"
    }
  },

};
