require('hardhat-deploy');
require('@openzeppelin/hardhat-upgrades');
require("hardhat-gas-reporter");
const config = require("@overnight-contracts/common/utils/hardhat-config");

module.exports = {
    namedAccounts: config.namedAccounts,
    networks: config.getNetwork('AVALANCHE'),
    solidity: config.solidity,
    etherscan: config.etherscan(),
    mocha: config.mocha,
    gasReporter: config.gasReport
};
