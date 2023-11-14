const { deployProxy } = require("@overnight-contracts/common/utils/deployProxy");
const { BASE } = require("@overnight-contracts/common/utils/assets");
const { ethers } = require("hardhat");
const { Roles } = require("@overnight-contracts/common/utils/roles");

module.exports = async ({ deployments }) => {
    const { save } = deployments;

    await deployProxy('BeefyAerodromeZap', deployments, save);
    console.log("BeefyAerodromeZap deploy done()");

    let params = {
        odosRouter: BASE.odosRouterV2,
        aerodromeRouter: BASE.aerodromeRouter
    }

    let zap = await ethers.getContract('BeefyAerodromeZap');
    await (await zap.setParams(params)).wait();
    console.log('BeefyAerodromeZap setParams done()');
};

module.exports.tags = ['BeefyAerodromeZap'];
