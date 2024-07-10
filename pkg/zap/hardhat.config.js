const dotenv = require('dotenv');
dotenv.config({path: process.cwd() +'/../../.env'});

require('hardhat-deploy');
require("hardhat-diamond-abi");
require('@openzeppelin/hardhat-upgrades');
require("@nomiclabs/hardhat-etherscan");
require('hardhat-contract-sizer');
require('@overnight-contracts/common/utils/hardhat-ovn');
require("@matterlabs/hardhat-zksync-deploy");
require("@matterlabs/hardhat-zksync-solc");
require("@matterlabs/hardhat-zksync-verify");

const configCore = require("@overnight-contracts/common/utils/hardhat-config");

let usedMethods = [];

let whitelistMethods = [
    "getCurrentPrice",
    "getTickSpacing",
    "tickToPrice",
    "priceToClosestTick",
    "getCurrentPoolTick",
    "closestTicksForCurrentTick",
    "getPositions",
    "getProportionForZap",
    "getProportionForRebalance",
    "zapIn",
    "zapOut",
    "rebalance",
    "setCoreParams",
    "setSlippages",
    "stakeSlippageBP",
    "odosRouter",
    "npm",
    "diamondCut"
];

module.exports = {
    namedAccounts: configCore.namedAccounts,
    networks: configCore.getNetworks(),
    solidity: configCore.solidity,
    etherscan: configCore.etherscan(),
    mocha: configCore.mocha,
    gasReporter: configCore.gasReport,
    diamondAbi: {
        name: "AerodromeCLZap",
        filter: function (abiElement, index, fullAbi, fullyQualifiedName) {
            if (usedMethods.includes(abiElement.name)) return false;
            usedMethods.push(abiElement.name);
            return abiElement.type === "event" || whitelistMethods.includes(abiElement.name);
        },
    },
};

