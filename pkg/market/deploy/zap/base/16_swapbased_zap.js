const { deployProxy } = require("@overnight-contracts/common/utils/deployProxy");
const { BASE } = require("@overnight-contracts/common/utils/assets");
const { ethers } = require("hardhat");

module.exports = async ({ deployments }) => {
    const { save } = deployments;

    let deployResult = await deployProxy('SwapBasedZap', deployments, save);

    let zap = await ethers.getContract('SwapBasedZap');
    await (await zap.grantRole(Roles.DEFAULT_ADMIN_ROLE, '0x5CB01385d3097b6a189d1ac8BA3364D900666445')).wait();
    await (await zap.setParams(
        {
            swapBasedRouter: BASE.swapBasedRouter,
            odosRouter: BASE.odosRouter
        }
    )).wait();
};

module.exports.tags = ['SwapBasedZap'];
