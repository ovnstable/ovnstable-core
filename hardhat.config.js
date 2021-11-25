require("@nomiclabs/hardhat-waffle");
require("@nomiclabs/hardhat-ganache");
require('hardhat-deploy');
require("@nomiclabs/hardhat-ethers");

task("accounts", "Prints the list of accounts", async (taskArgs, hre) => {
    const accounts = await hre.ethers.getSigners();

    for (const account of accounts) {
        console.log(account.address);
    }
});


const fsExtra = require('fs-extra')
const readdirp = require('readdirp');
const path = require('path');
const {node_url, accounts} = require("./utils/network");

task("compile:vue", "Compile and move .json to folder vapp", async (taskArgs, hre) => {

    await hre.run('compile');
    fsExtra.emptyDirSync('vapp/src/contracts');

    let root = 'artifacts/contracts/';
    for await (const entry of readdirp(root, {fileFilter: '*.json', alwaysStat: true})) {
        let file = root + entry.path
        let baseName = path.basename(file);
        if (!baseName.includes('.dgb')) {
            fsExtra.copy(file, 'vapp/src/contracts/' + baseName)
        }
    }

});


module.exports = {


    namedAccounts: {
        deployer: {
            default: 0,
            polygon: "0x5CB01385d3097b6a189d1ac8BA3364D900666445",
        },
    },

    networks: {

        polygon: {
            url: node_url('polygon'),
            accounts: accounts('polygon'),

        },

        ganache:{
            url: "http://127.0.0.1:8555",
            chainId: 1337
        },

        hardhat: {

            forking: {
                url: "https://polygon-mainnet.infura.io/v3/66f5eb50848f458cb0f0506cc1036fea",
                blockNumber: 21778409 ,
            },
            accounts: {
                accountsBalance: "100000000000000000000000000"
            }

        }

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
        timeout: 200000
    }


};
