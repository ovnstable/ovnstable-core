require("@nomiclabs/hardhat-waffle");
require("@nomiclabs/hardhat-ganache");
require('hardhat-deploy');
require("@nomiclabs/hardhat-ethers");
require('@openzeppelin/hardhat-upgrades');
require("@nomiclabs/hardhat-etherscan");

task("accounts", "Prints the list of accounts", async (taskArgs, hre) => {
    const accounts = await hre.ethers.getSigners();

    for (const account of accounts) {
        console.log(account.address);
    }
});

const {node_url, accounts} = require("./utils/network");


module.exports = {


    namedAccounts: {
        deployer: {
            default: 0,
            polygon: "0x5CB01385d3097b6a189d1ac8BA3364D900666445",
            ganache: "0xa0df350d2637096571F7A701CBc1C5fdE30dF76A"
        },

        recipient: {
            default: 1,
        },

        anotherAccount: {
            default: 2
        }
    },

    networks: {

        polygon: {
            url: node_url('polygon'),
            accounts: accounts('polygon'),
            gasPrice: 70000000000
        },

        polygon_dev: {
            url: node_url('polygon'),
            accounts: accounts('polygon'),
            gasPrice: 70000000000,
        },

        ganache:{
            url: "http://127.0.0.1:8555",
            chainId: 1337
        },

        hardhat: {
            forking: {
                url: "https://polygon-rpc.com/",
                blockNumber: 23299229,
            },
            accounts: {
                accountsBalance: "100000000000000000000000000"
            },
            timeout: 200000
        },

    },

    solidity: {
        version: "0.8.6",
        settings: {
            optimizer: {
                enabled: true,
                runs: 200
            }
        }
    },


    mocha: {
        timeout: 600000
    },


};
