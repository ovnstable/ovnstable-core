const { deployProxy } = require("@overnight-contracts/common/utils/deployProxy");
const { ARBITRUM } = require("@overnight-contracts/common/utils/assets");
const { ethers } = require("hardhat");
const { Roles } = require("@overnight-contracts/common/utils/roles");

module.exports = async ({ deployments }) => {
    const { save } = deployments;

    await deployProxy('ChronosZap', deployments, save);
    console.log("ChronosZap deploy done()");


    let params = {
        odosRouter: ARBITRUM.odosRouterV2,
        chronosRouter: ARBITRUM.chronosRouter
    }

    let zap = await ethers.getContract('ChronosZap');
    await (await zap.setParams(params)).wait();
    console.log('ChronosZap setParams done()');
};

module.exports.tags = ['ChronosZap'];
