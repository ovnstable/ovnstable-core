const dotenv = require('dotenv');
dotenv.config({path:__dirname+ '/../../../.env'});

const {node_url, accounts, blockNumber} = require("./network");
const {getGasPrice} = require("./network");
let gasPrice = getGasPrice();

let networks = {
    polygon: {
        url: node_url('polygon'),
        accounts: accounts('polygon'),
        timeout: 36200000,
        gasPrice: gasPrice,
    },

    polygon_dev: {
        url: node_url('polygon'),
        accounts: accounts('polygon'),
        timeout: 36200000,
        gasPrice: gasPrice,
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
    networks: networks,
    namedAccounts: namedAccounts,
    solidity: solidity,
    mocha: mocha,
    gasReport: gasReport,
    etherscan: getEtherScan
};
