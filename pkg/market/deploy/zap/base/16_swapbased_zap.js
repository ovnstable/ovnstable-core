const { deployProxy } = require("@overnight-contracts/common/utils/deployProxy");
const { BASE } = require("@overnight-contracts/common/utils/assets");
const { ethers } = require("hardhat");
const { Roles } = require("@overnight-contracts/common/utils/roles");

module.exports = async ({ deployments }) => {
    const { save } = deployments;

    let deployResult = await deployProxy('SwapBasedZap', deployments, save);

    let zap = await ethers.getContract('SwapBasedZap');
    await (await zap.setParams(
        {
            swapBasedRouter: BASE.swapBasedRouter,
            odosRouter: BASE.odosRouterV2
        }
    )).wait();
};

module.exports.tags = ['SwapBasedZap'];
