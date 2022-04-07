require('hardhat-deploy');
require("@nomiclabs/hardhat-ethers");
require('@openzeppelin/hardhat-upgrades');
require("@nomiclabs/hardhat-etherscan");
require("hardhat-gas-reporter");

const config = require("../common/utils/hardhat-config");

module.exports = {

    namedAccounts: config.namedAccounts,
    networks: config.networks,
    solidity: config.solidity,
    etherscan: config.etherscan(),
    mocha: config.mocha,
    gasReporter: config.gasReport

};
