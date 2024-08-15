const { deployProxy } = require("@overnight-contracts/common/utils/deployProxy");
const { BASE } = require("@overnight-contracts/common/utils/assets");
const { ethers } = require("hardhat");
const { Roles } = require("@overnight-contracts/common/utils/roles");

module.exports = async ({ deployments }) => {
    const { save } = deployments;

    await deployProxy('AerodromeZap', deployments, save);
    console.log("AerodromeZap deploy done()");

    let params = {
        odosRouter: BASE.odosRouterV2,
        aerodromeRouter: BASE.aerodromeRouter
    }

    let zap = await ethers.getContract('AerodromeZap');

    await (await zap.setParams(params)).wait();
    console.log('AerodromeZap setParams done()');
};

module.exports.tags = ['AerodromeZap'];
