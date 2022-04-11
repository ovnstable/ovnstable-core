const dotenv = require('dotenv');
dotenv.config({path:__dirname+ '/../../../.env'});

const {node_url, accounts, blockNumber} = require("./network");
const {getGasPrice} = require("./network");
let gasPrice = getGasPrice();

let timeout = 362000000;

function getFantomNetwork() {

    let forkingUrl = node_url('fantom');
    let accountsFantom = accounts('fantom');
    let blockNumberValue = blockNumber('fantom');
    console.log(`Forking url: [${forkingUrl}:${blockNumberValue}]`);

    return {
        fantom: {
            url: forkingUrl,
            accounts: accountsFantom,
            timeout: timeout,
            gasPrice: gasPrice,
        },

        fantom_dev: {
            url: forkingUrl,
            accounts: accountsFantom,
            timeout: timeout,
            gasPrice: gasPrice,
        },

        localhost: {
            timeout: timeout,
            accounts: accountsFantom,
        },

        hardhat: {
            forking: {
                url: forkingUrl,
                blockNumber: blockNumberValue,
            },
            accounts: {
                accountsBalance: "100000000000000000000000000"
            },
            timeout: timeout
        },
    }

}


function getPolygonNetwork() {

    let forkingUrl = node_url('polygon');
    let accountsPolygon = accounts('polygon');
    let blockNumberValue = blockNumber('polygon');
    console.log(`Forking url: [${forkingUrl}:${blockNumberValue}]`);

    return {
        polygon: {
            url: forkingUrl,
            accounts: accountsPolygon,
            timeout: timeout,
            gasPrice: gasPrice,
        },

        polygon_dev: {
            url: forkingUrl,
            accounts: accountsPolygon,
            timeout: timeout,
            gasPrice: gasPrice,
        },

        localhost: {
            timeout: timeout,
            accounts: accountsPolygon,
        },

        hardhat: {
            forking: {
                url: forkingUrl,
                blockNumber: blockNumberValue,
            },
            accounts: {
                accountsBalance: "100000000000000000000000000"
            },
            timeout: timeout
        },
    }
}

function getNetwork(network) {
    console.log(`Network: [${network}]`)

    switch (network){
        case 'FANTOM':
            return getFantomNetwork();
        case 'POLYGON':
            return getPolygonNetwork();
        default:
            throw new Error('Unknown network id');
    }

}

let namedAccounts = {
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
}


let solidity = {
    version: "0.8.6",
    settings: {
        optimizer: {
            enabled: true,
            runs: 200
        }
    }
}

let mocha = require("./mocha-report-setting")

let gasReport = {
    enabled: false, // Gas Reporter hides unit-test-mocha report
    currency: 'MATIC',
    gasPrice: 70,
    outputFile: 'gas-report'
}

function getEtherScan(chain){
    if (!chain)
        chain = 137

    let object = {};

    let api;
    switch (chain){
        case 137:
            api = process.env.ETHERSCAN_API
    }

    object.apiKey = api;

    return object;
}

module.exports = {
    getNetwork: getNetwork,
    namedAccounts: namedAccounts,
    solidity: solidity,
    mocha: mocha,
    gasReport: gasReport,
    etherscan: getEtherScan
};
