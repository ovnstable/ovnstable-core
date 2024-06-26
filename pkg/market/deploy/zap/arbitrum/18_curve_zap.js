const { deployProxy } = require("@overnight-contracts/common/utils/deployProxy");
const { ARBITRUM } = require("@overnight-contracts/common/utils/assets");
const { ethers } = require("hardhat");
const { Roles } = require("@overnight-contracts/common/utils/roles");

module.exports = async ({ deployments }) => {
    const { save } = deployments;

    await deployProxy('CurveNGZap', deployments, save);
    console.log("CurveNGZap deploy done()");

    let params = {
        odosRouter: ARBITRUM.odosRouterV2,
    }

    let zap = await ethers.getContract('CurveNGZap');

    await (await zap.setParams(params)).wait();
    console.log('CurveNGZap setParams done()');
};

module.exports.tags = ['CurveNGZap'];
