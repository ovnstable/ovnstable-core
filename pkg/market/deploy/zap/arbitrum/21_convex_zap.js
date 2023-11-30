const { deployProxy } = require("@overnight-contracts/common/utils/deployProxy");
const { ARBITRUM } = require("@overnight-contracts/common/utils/assets");
const { ethers } = require("hardhat");
const { Roles } = require("@overnight-contracts/common/utils/roles");

module.exports = async ({ deployments }) => {
    const { save } = deployments;

    await deployProxy('ConvexZap3CurveFraxbp', deployments, save);
    console.log("ConvexZap3CurveFraxbp deploy done()");

    let params = {
        odosRouter: ARBITRUM.odosRouterV2
    }

    let zap = await ethers.getContract('ConvexZap3CurveFraxbp');

    await (await zap.setParams(params)).wait();
    console.log('ConvexZap3CurveFraxbp setParams done()');
};

module.exports.tags = ['ConvexZap3CurveFraxbp'];
