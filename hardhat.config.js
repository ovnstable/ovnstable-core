require("@nomiclabs/hardhat-waffle");
require("@nomiclabs/hardhat-ganache");
require('hardhat-deploy');
require("@nomiclabs/hardhat-ethers")

task("accounts", "Prints the list of accounts", async (taskArgs, hre) => {
  const accounts = await hre.ethers.getSigners();

  for (const account of accounts) {
    console.log(account.address);
  }
});


const fsExtra = require('fs-extra')
const readdirp = require('readdirp');
const path = require('path');

task("compile:vue", "Compile and move .json to folder vapp", async (taskArgs, hre) => {

  await hre.run('compile');
  fsExtra.emptyDirSync('vapp/src/contracts');

  let root = 'artifacts/contracts/';
  for await (const entry of readdirp(root, {fileFilter: '*.json', alwaysStat: true})) {
    let file = root + entry.path
    let baseName = path.basename(file);
    if (!baseName.includes('.dgb')){
      fsExtra.copy(file, 'vapp/src/contracts/' + baseName)
    }
  }

});


module.exports = {


  namedAccounts: {
    deployer: 0,
  },

  networks: {

    hardhat: {
      forking: {
        url: "https://polygon-mainnet.infura.io/v3/66f5eb50848f458cb0f0506cc1036fea",
        blockNumber: 21675000,
      },

      accounts:{
        accountsBalance: "1000000000000000000000000"
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


  paths: {
    sources: "./contracts",
    tests: "./test",
    cache: "./cache",
    artifacts: "./artifacts"
  },

  mocha: {
    timeout: 200000
  }


};
