const { deployProxy } = require("@overnight-contracts/common/utils/deployProxy");
const { BASE } = require("@overnight-contracts/common/utils/assets");
const { ethers } = require("hardhat");
const { Roles } = require("@overnight-contracts/common/utils/roles");

module.exports = async ({ deployments }) => {
    const { save } = deployments;

    let deployResult = await deployProxy('BaseSwapZap', deployments, save);
    let params = {
        baseSwapRouter: BASE.baseSwapRouter,
        odosRouter: BASE.odosRouterV2
    }

    let zap = await ethers.getContract('BaseSwapZap');
    await (await zap.setParams(params)).wait();
};

module.exports.tags = ['BaseSwapZap'];
