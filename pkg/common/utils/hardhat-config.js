const dotenv = require('dotenv');

console.log('Process:' + process.cwd());
dotenv.config({path:__dirname+ '/../../../.env'});

const {node_url, accounts, blockNumber} = require("./network");
const {getGasPrice} = require("./network");
let gasPrice = getGasPrice();

let timeout = 362000000;

function getNetworkByName(network) {

    let forkingUrl = node_url(network);
    let accountsNetwork = accounts(network);
    let blockNumberValue = blockNumber(network);
    console.log(`[Node] Forking url: [${forkingUrl}:${blockNumberValue}]`);

    return {

        platform: {
            url: forkingUrl,
            accounts: accountsNetwork,
            timeout: timeout,
            gasPrice: gasPrice,
        },

        arbitrum: {
            url: forkingUrl,
            accounts: accountsNetwork,
            timeout: timeout,
            gasPrice: gasPrice,
        },

        arbitrum_dai: {
            url: forkingUrl,
            accounts: accountsNetwork,
            timeout: timeout,
            gasPrice: gasPrice,
        },

        zksync: {
            url: forkingUrl,
            accounts: accountsNetwork,
            timeout: timeout,
            gasPrice: gasPrice,
        },

        avalanche: {
            url: forkingUrl,
            accounts: accountsNetwork,
            timeout: timeout,
            gasPrice: gasPrice,
        },

        optimism: {
            url: forkingUrl,
            accounts: accountsNetwork,
            timeout: timeout,
            gasPrice: gasPrice,
        },

        optimism_dai: {
            url: forkingUrl,
            accounts: accountsNetwork,
            timeout: timeout,
            gasPrice: gasPrice,
        },

        bsc: {
            url: forkingUrl,
            accounts: accountsNetwork,
            timeout: timeout,
            gasPrice: gasPrice,
        },

        bsc_usdt: {
            url: forkingUrl,
            accounts: accountsNetwork,
            timeout: timeout,
            gasPrice: gasPrice,
        },

        fantom: {
            url: forkingUrl,
            accounts: accountsNetwork,
            timeout: timeout,
            gasPrice: gasPrice,
        },

        polygon: {
            url: forkingUrl,
            accounts: accountsNetwork,
            timeout: timeout,
            gasPrice: gasPrice,
        },

        polygon_ins: {
            url: forkingUrl,
            accounts: accountsNetwork,
            timeout: timeout,
            gasPrice: gasPrice,
        },

        polygon_dev: {
            url: forkingUrl,
            accounts: accountsNetwork,
            timeout: timeout,
            gasPrice: gasPrice,
        },

        localhost: {
            timeout: timeout,
            accounts: accountsNetwork,
        },

        hardhat: {
            forking: {
                url: forkingUrl,
                blockNumber: blockNumberValue,
                ignoreUnknownTxType: true,
            },
            accounts: {
                accountsBalance: "100000000000000000000000000"
            },
            timeout: timeout
        },
    }
}

function getNetwork(network) {
    console.log(`[Node] Network: [${network}]`);
    return getNetworkByName(network.toLowerCase());
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
const {setDefault} = require("./assets");

let gasReport = {
    enabled: false, // Gas Reporter hides unit-test-mocha report
    currency: 'MATIC',
    gasPrice: 70,
    outputFile: 'gas-report'
}

function getEtherScan(chain){
    if (!chain) {
        chain = process.env.ETH_NETWORK
    }

    let object = {};

    let api = process.env[`ETHERSCAN_API_${chain.toUpperCase()}`];

    if (api){
        object.apiKey = api;
    }else {
        throw new Error('Not defined env: ' + `ETHERSCAN_API_${chain.toUpperCase()}`);
    }

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
