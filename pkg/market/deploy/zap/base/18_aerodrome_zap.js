const { deployProxy } = require("@overnight-contracts/common/utils/deployProxy");
const { BASE } = require("@overnight-contracts/common/utils/assets");
const { ethers } = require("hardhat");
const { Roles } = require("@overnight-contracts/common/utils/roles");

module.exports = async ({ deployments }) => {
    const { save } = deployments;

    await deployProxy('AerodromeZap', deployments, save);
    console.log("AerodromeZap deploy done()");

    let params = {
        odosRouter: BASE.odosRouter,
        aerodromeRouter: BASE.aerodromeRouter
    }

    let zap = await ethers.getContract('AerodromeZap');
    await (await zap.grantRole(Roles.DEFAULT_ADMIN_ROLE, '0x5CB01385d3097b6a189d1ac8BA3364D900666445')).wait();

    await (await zap.setParams(params)).wait();
    console.log('AerodromeZap setParams done()');
};

module.exports.tags = ['AerodromeZap'];
