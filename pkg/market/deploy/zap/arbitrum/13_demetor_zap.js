const { deployProxy } = require("@overnight-contracts/common/utils/deployProxy");
const { ARBITRUM } = require("@overnight-contracts/common/utils/assets");
const { ethers } = require("hardhat");
const { Roles } = require("@overnight-contracts/common/utils/roles");

module.exports = async ({ deployments }) => {
    const { save } = deployments;

    await deployProxy('DemetorZap', deployments, save);
    console.log("DemetorZap deploy done()");

    let params = {
        odosRouter: ARBITRUM.odosRouterV2,
        positionHelper: ARBITRUM.positionHelperCamelot
    }

    let zap = await ethers.getContract('DemetorZap');

    await (await zap.setParams(params)).wait();
    console.log('DemetorZap setParams done()');
};

module.exports.tags = ['DemetorZap'];
