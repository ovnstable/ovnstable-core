const {
    getContract,
    initWallet,
    transferETH,
    getWalletAddress,
} = require("@overnight-contracts/common/utils/script-utils");
const hre = require("hardhat");
const { ethers } = require("hardhat");
const sampleModule = require("@openzeppelin/hardhat-upgrades/dist/utils/deploy-impl");
const { deployProxyMulti } = require("@overnight-contracts/common/utils/deployProxy");

module.exports = async ({ deployments }) => {
    let wallet = await initWallet();

    if( hre.network.name == 'localhost') await transferETH(1, await getWalletAddress());

    console.log("Try to deploy UsdtPlusMigration");
    hre.ovn.impl = true;

    const impl = await deployProxyMulti("UsdtPlusToken", "UsdPlusToken", deployments, deployments.save, {
        args: ["USDT+", "USDT+", 6],
    });

    console.log(`Token implementation: ${impl}`); 
};

module.exports.tags = ["DeployBoot"];
