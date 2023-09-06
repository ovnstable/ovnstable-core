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
    let grantRoleResult = await (await zap.grantRole(Roles.DEFAULT_ADMIN_ROLE, '0x5CB01385d3097b6a189d1ac8BA3364D900666445')).wait();
    await (await zap.setParams(params)).wait();
};

module.exports.tags = ['BaseSwapZap'];
