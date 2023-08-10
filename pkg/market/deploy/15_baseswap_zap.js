const { deployProxy } = require("@overnight-contracts/common/utils/deployProxy");
const { BASE } = require("@overnight-contracts/common/utils/assets");
const { ethers } = require("hardhat");
const { Roles } = require("@overnight-contracts/common/utils/roles");

module.exports = async ({ deployments }) => {
    const { save } = deployments;

    let deployResult = await deployProxy('BaseswapZap', deployments, save);
    console.log("BaseswapZap deploy done()", deployResult.address);

    let params = {
        baseswapRouter: BASE.baseswapRouter,
        odosRouter: BASE.odosRouter
    }

    console.log('BaseswapZap setParams ...')
    let zap = await ethers.getContract('BaseswapZap');
    console.log('BaseswapZap setParams ...', zap.address)
    let grantRoleResult = await (await zap.grantRole(Roles.DEFAULT_ADMIN_ROLE, '0x5CB01385d3097b6a189d1ac8BA3364D900666445')).wait();
    console.log('BaseswapZap grantRole ...');

    await (await zap.setParams(params)).wait();
    console.log('BaseswapZap setParams done()');
};

module.exports.tags = ['BaseswapZap'];
