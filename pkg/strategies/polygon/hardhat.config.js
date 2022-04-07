require('hardhat-deploy');
require("@nomiclabs/hardhat-ethers");
require('@openzeppelin/hardhat-upgrades');
require("@nomiclabs/hardhat-etherscan");
require("hardhat-gas-reporter");

const dotenv = require('dotenv');
dotenv.config();


const {node_url, accounts, blockNumber, getGasPrice} = require("../../common/utils/network");


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
            gasPrice: getGasPrice(),
        },

        polygon_dev: {
            url: node_url('polygon'),
            accounts: accounts('polygon'),
            timeout: 36200000,
            gasPrice: getGasPrice(),
        },


        localhost: {
            timeout: 362000000,
            accounts: accounts('polygon'),
        },

        hardhat: {
            forking: {
                url: node_url('polygon'),
                blockNumber: blockNumber('polygon'),
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


    etherscan: {
        apiKey: process.env.ETHERSCAN_API
    },

    mocha: require("../../common/utils/mocha-report-setting"),

    gasReporter: {
        enabled: false, // Gas Reporter hides unit-test-mocha report
        currency: 'MATIC',
        gasPrice: 70,
        outputFile: 'gas-report'
    }

};
