const { deployProxy } = require("@overnight-contracts/common/utils/deployProxy");
const { ARBITRUM } = require("@overnight-contracts/common/utils/assets");
const { ethers } = require("hardhat");
const { Roles } = require("@overnight-contracts/common/utils/roles");

module.exports = async ({ deployments }) => {
    const { save } = deployments;

    await deployProxy('RamsesZap', deployments, save);
    console.log("RamsesZap deploy done()");

    let params = {
        odosRouter: ARBITRUM.odosRouterV2,
        ramsesRouter: ARBITRUM.ramsesRouter
    }

    let zap = await ethers.getContract('RamsesZap');
    await (await zap.grantRole(Roles.DEFAULT_ADMIN_ROLE, '0x5CB01385d3097b6a189d1ac8BA3364D900666445')).wait();

    await (await zap.setParams(params)).wait();
    console.log('RamsesZap setParams done()');
};

module.exports.tags = ['RamsesZap'];
