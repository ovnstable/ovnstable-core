require('hardhat-deploy');
if (!process.env.NO_OZ_UPGRADES) {
    require('@openzeppelin/hardhat-upgrades');
}
require("@nomicfoundation/hardhat-verify");
require("hardhat-gas-reporter")
require("@nomiclabs/hardhat-waffle");
require('hardhat-contract-sizer');
require('@overnight-contracts/common/utils/hardhat-ovn');
function isZkSyncNetwork() {
    const argv = process.argv;
    for (let i = 0; i < argv.length - 1; i++) {
        if (argv[i] === "--network") {
            return argv[i + 1].startsWith("zksync");
        }
    }
    const envNetwork = process.env.HARDHAT_NETWORK || process.env.STAND || "";
    return envNetwork.startsWith("zksync");
}
if (isZkSyncNetwork()) {
    require("@matterlabs/hardhat-zksync-deploy");
    require("@matterlabs/hardhat-zksync-solc");
    require("@matterlabs/hardhat-zksync-verify");
}

const config = require("../common/utils/hardhat-config");

module.exports = {

    namedAccounts: config.namedAccounts,
    networks: config.getNetworks(),
    solidity: config.solidity,
    zksolc: config.zksolc,
    etherscan: config.etherscan(),
    mocha: config.mocha,
    gasReporter: config.gasReport

};
