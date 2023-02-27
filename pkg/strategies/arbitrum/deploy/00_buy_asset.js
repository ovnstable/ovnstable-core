const {transferETH, transferAsset} = require("@overnight-contracts/common/utils/script-utils");
const {ARBITRUM} = require('@overnight-contracts/common/utils/assets');
const hre = require("hardhat");

module.exports = async ({getNamedAccounts, deployments}) => {
    const {deployer} = await getNamedAccounts();

    await transferETH(1, deployer);

    console.log('[TEST] Buy assets ....');
    if (process.env.STAND === "arbitrum") {
        await transferAsset(ARBITRUM.usdc, deployer);
    }else if (process.env.STAND === "arbitrum_dai"){
        await transferAsset(ARBITRUM.dai, deployer);
    }

};

module.exports.tags = ['test'];
