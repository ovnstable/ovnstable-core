const { deployProxy } = require("@overnight-contracts/common/utils/deployProxy");
const { BASE } = require("@overnight-contracts/common/utils/assets");
const { ethers } = require("hardhat");
const { Roles } = require("@overnight-contracts/common/utils/roles");

module.exports = async ({ deployments }) => {
    const { save } = deployments;

    await deployProxy('AerodromeCLZap', deployments, save);
    console.log("AerodromeCLZap deploy done()");

    let params = {
        odosRouter: BASE.odosRouterV2,
        npm: BASE.aerodromeNpm
    }

    let zap = await ethers.getContract('AerodromeCLZap');

    await (await zap.setParams(params)).wait();
    console.log('AerodromeZap setParams done()');
};

module.exports.tags = ['AerodromeCLZap'];
