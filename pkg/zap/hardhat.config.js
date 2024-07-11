const dotenv = require('dotenv');
dotenv.config({path: process.cwd() +'/../../.env'});

require('hardhat-deploy');
require('@openzeppelin/hardhat-upgrades');
require("@nomiclabs/hardhat-etherscan");
require('hardhat-contract-sizer');
require('@overnight-contracts/common/utils/hardhat-ovn');
require("@matterlabs/hardhat-zksync-deploy");
require("@matterlabs/hardhat-zksync-solc");
require("@matterlabs/hardhat-zksync-verify");

const configCore = require("@overnight-contracts/common/utils/hardhat-config");

module.exports = {
    namedAccounts: configCore.namedAccounts,
    networks: configCore.getNetworks(),
    solidity: configCore.solidity,
    etherscan: configCore.etherscan(),
    mocha: configCore.mocha,
    gasReporter: configCore.gasReport,
};

