const { deployProxy } = require("@overnight-contracts/common/utils/deployProxy");
const { BASE } = require("@overnight-contracts/common/utils/assets");
const { ethers } = require("hardhat");
const { Roles } = require("@overnight-contracts/common/utils/roles");

module.exports = async ({ deployments }) => {
    const { save } = deployments;

    let deployResult = await deployProxy('BaseSwapZap', deployments, save);
    console.log("BaseSwapZap deploy done()", deployResult.address);

    let params = {
        baseSwapRouter: BASE.baseSwapRouter,
        odosRouter: BASE.odosRouter
    }

    console.log('BaseSwapZap setParams ...')
    let zap = await ethers.getContract('BaseSwapZap');
    console.log('BaseSwapZap setParams ...', zap.address)
    let grantRoleResult = await (await zap.grantRole(Roles.DEFAULT_ADMIN_ROLE, '0x5CB01385d3097b6a189d1ac8BA3364D900666445')).wait();
    console.log('BaseSwapZap grantRole ...');

    await (await zap.setParams(params)).wait();
    console.log('BaseSwapZap setParams done()');
};

module.exports.tags = ['BaseSwapZap'];
