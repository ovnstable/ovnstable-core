const {ethers} = require("hardhat");
const {BSC} = require('@overnight-contracts/common/utils/assets');
const hre = require('hardhat');

module.exports = async ({getNamedAccounts, deployments}) => {
    const {deployer} = await getNamedAccounts();

    if (process.env.STAND === "bsc_usdt") {
        await transferAsset(BSC.usdt, deployer);
    } else {
        await transferAsset(BSC.usdc, deployer);
    }
};

module.exports.tags = ['test'];
