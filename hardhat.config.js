require("@nomiclabs/hardhat-waffle");
require("@nomiclabs/hardhat-ganache");
require('hardhat-deploy');
require("@nomiclabs/hardhat-ethers");
require('@openzeppelin/hardhat-upgrades');
require("@nomiclabs/hardhat-etherscan");
require("hardhat-gas-reporter");
require("hardhat-tracer");

const dotenv = require('dotenv');
dotenv.config();

let mochaSetting = {
    timeout: 36200000,
}

if (process.env.TEST_REPORT) {
    console.log('Mocha setting report init')
    mochaSetting.reporter = "utils/reporter-mocha.js";
    mochaSetting["reporter-option"] = [
        "output=report.json"
    ];
}


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
            timeout: 36200000,
            gasPrice: 80000000000,
        },

        polygon_dev: {
            url: node_url('polygon'),
            accounts: accounts('polygon'),
            timeout: 36200000,
        },


        polygon_dev_new: {
            url: node_url('polygon'),
            accounts: accounts('polygon'),
            timeout: 36200000,
        },


        ganache: {
            url: "http://127.0.0.1:8555",
            chainId: 1337
        },

        localhost: {
            timeout: 362000000
        },

        hardhat: {
            forking: {
                url: node_url('polygon'),
                blockNumber: 24689788,
            },
            accounts: {
                accountsBalance: "100000000000000000000000000"
            },
            timeout: 362000000
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


    mocha: mochaSetting,

    gasReporter: {
        enabled: false, // Gas Reporter hides unit-test-mocha report
        currency: 'MATIC',
        gasPrice: 70,
        outputFile: 'gas-report'
    }

};
