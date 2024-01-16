const dotenv = require('dotenv');

console.log('Process:' + process.cwd());
dotenv.config({path:__dirname+ '/../../../.env'});

const {node_url, accounts, blockNumber, isZkSync} = require("./network");
const {getGasPrice} = require("./network");
let gasPrice = getGasPrice();

let timeout = 362000000;


class Chain {

    static get ARBITRUM() { return 'ARBITRUM'; }
    static get BASE() { return 'BASE'; }
    static get POLYGON() { return 'POLYGON'; }
    static get OPTIMISM() { return 'OPTIMISM'; }
    static get BSC() { return 'BSC'; }
    static get ZKSYNC() { return 'ZKSYNC'; }
    static get LINEA() { return 'LINEA'; }


    static get list() {
        return ['ARBITRUM', 'BASE', 'POLYGON', 'OPTIMISM', 'BSC', 'ZKSYNC', 'LINEA']
    }
}



function getNetworks() {

    let accountsNetwork = accounts('polygon');

    let zkSync = isZkSync();



    let localhost;
    if (zkSync){
        localhost = {
            // Use local node zkSync for testing
            url: 'http://localhost:8011',
            timeout: timeout,
            accounts: accountsNetwork,
            zksync: true,
            ethNetwork: "http://localhost:8545",
        }
    }else {
        localhost = {
            timeout: timeout,
            accounts: accountsNetwork,
            zksync: false,
        }
    }

    return {

        base: {
            url: node_url('base'),
            accounts: accountsNetwork,
            timeout: timeout,
            gasPrice: "auto",
            zksync: false,
        },

        base_dai: {
            url: node_url('base'),
            accounts: accountsNetwork,
            timeout: timeout,
            gasPrice: "auto",
            zksync: false,
        },

        base_usdc: {
            url: node_url('base'),
            accounts: accountsNetwork,
            timeout: timeout,
            gasPrice: "auto",
            zksync: false,
        },

        linea_usdt: {
            url: node_url('linea'),
            accounts: accountsNetwork,
            timeout: timeout,
            gasPrice: 'auto',
            zksync: false,
        },


        linea: {
            url: node_url('linea'),
            accounts: accountsNetwork,
            timeout: timeout,
            gasPrice: 'auto',
            zksync: false,
        },

        arbitrum: {
            url: node_url('arbitrum'),
            accounts: accountsNetwork,
            timeout: timeout,
            gasPrice: "auto",
            zksync: false,
        },

        arbitrum_eth: {
            url: node_url('arbitrum'),
            accounts: accountsNetwork,
            timeout: timeout,
            gasPrice: "auto",
            zksync: false,
        },


        arbitrum_dai: {
            url: node_url('arbitrum'),
            accounts: accountsNetwork,
            timeout: timeout,
            gasPrice: "auto",
            zksync: false,
        },

        arbitrum_usdt: {
            url: node_url('arbitrum'),
            accounts: accountsNetwork,
            timeout: timeout,
            gasPrice: "auto",
            zksync: false,
        },

        zksync: {
            url: node_url('zksync'),
            accounts: accountsNetwork,
            timeout: timeout,
            gasPrice: "auto",
            ethNetwork: "mainnet",
            zksync: true,
        },

        optimism: {
            url: node_url('optimism'),
            accounts: accountsNetwork,
            timeout: timeout,
            gasPrice: 'auto',
            zksync: false,
        },

        optimism_dai: {
            url: node_url('optimism'),
            accounts: accountsNetwork,
            timeout: timeout,
            gasPrice: "auto",
            zksync: false,
        },

        bsc: {
            url: node_url('bsc'),
            accounts: accountsNetwork,
            timeout: timeout,
            gasPrice: "auto",
            zksync: false,
        },

        bsc_usdt: {
            url: node_url('bsc'),
            accounts: accountsNetwork,
            timeout: timeout,
            gasPrice: "auto",
        },


        polygon: {
            url: node_url('polygon'),
            accounts: accountsNetwork,
            timeout: timeout,
            gasPrice: "auto",
            zksync: false,
        },


        localhost: localhost,

        hardhat: {
            zksync: zkSync,
            forking: {
                url: node_url(process.env.ETH_NETWORK),
                blockNumber: blockNumber(process.env.ETH_NETWORK),
                ignoreUnknownTxType: true,
            },
            accounts: {
                accountsBalance: "100000000000000000000000000"
            },
            timeout: timeout
        },
    }
}

function getChainFromNetwork(network){

    if (network) {

        network = network.toLowerCase();
        for (let chain of Chain.list) {

            // network can be = arbitrum_dai | optimism | base_dai ...
            // chain only = POLYGON|ARBITRUM|BASE ...

            if (network.includes(chain.toLowerCase())){
                return chain;
            }
        }
    }

    throw new Error(`Unknown network: ${network}`)

}


let namedAccounts = {
    deployer: {
        default: 0,
        polygon: '0x66B439c0a695cc3Ed3d9f50aA4E6D2D917659FfD',
        ganache: "0xa0df350d2637096571F7A701CBc1C5fdE30dF76A"
    },

    recipient: {
        default: 1,
    },

    anotherAccount: {
        default: 2
    }
}

let zksolc = {
    version: "1.3.5",
    compilerSource: "binary",
    settings: {},
}

let solidity = {
    version: "0.8.17",
    settings: {
        optimizer: {
            enabled: true,
            runs: 200
        }
    }
}

let mocha = require("./mocha-report-setting")
const {ARBITRUM, BASE, POLYGON, OPTIMISM} = require("./assets");
const {Wallets} = require("./wallets");

let gasReport = {
    enabled: false, // Gas Reporter hides unit-test-mocha report
    currency: 'MATIC',
    gasPrice: 70,
    outputFile: 'gas-report'
}

function getEtherScan(){

    let object = {

        customChains: [
            {
                network: "base",
                chainId:  8453,
                urls: {
                    apiURL: "https://api.basescan.org/api",
                    browserURL: "https://basescan.org"
                }
            },
            {
                network: "base_dai",
                chainId:  8453,
                urls: {
                    apiURL: "https://api.basescan.org/api",
                    browserURL: "https://basescan.org"
                }
            },
            {
                network: "linea",
                chainId:  59144,
                urls: {
                    apiURL: "https://api.lineascan.build/api",
                    browserURL: "https://lineascan.build"
                }
            },
            {
                network: "linea_usdt",
                chainId:  59144,
                urls: {
                    apiURL: "https://api.lineascan.build/api",
                    browserURL: "https://lineascan.build"
                }
            }
        ]

    };


    // Run command to show support native chains: npx hardhat verify --list-networks
    // if plugin not support chain then add chain to customChains section
    object.apiKey = {
        base: process.env[`ETHERSCAN_API_BASE`],
        base_dai: process.env[`ETHERSCAN_API_BASE`],
        linea: process.env[`ETHERSCAN_API_LINEA`],
        linea_usdt: process.env[`ETHERSCAN_API_LINEA`],
        optimisticEthereum: process.env[`ETHERSCAN_API_OPTIMISM`],
        polygon: process.env[`ETHERSCAN_API_POLYGON`],
        bsc: process.env[`ETHERSCAN_API_BSC`],
        arbitrumOne: process.env[`ETHERSCAN_API_ARBITRUM`],
    }

    return object;
}

module.exports = {
    Chain: Chain,
    getChainFromNetwork: getChainFromNetwork,
    getNetworks: getNetworks,
    namedAccounts: namedAccounts,
    solidity: solidity,
    zksolc: zksolc,
    mocha: mocha,
    gasReport: gasReport,
    etherscan: getEtherScan
};
