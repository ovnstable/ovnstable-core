const { deployProxy } = require("@overnight-contracts/common/utils/deployProxy");
const { BASE } = require("@overnight-contracts/common/utils/assets");
const { ethers } = require("hardhat");
const { Roles } = require("@overnight-contracts/common/utils/roles");

module.exports = async ({ deployments }) => {
    const { save } = deployments;

    await deployProxy('CurveZap', deployments, save);
    console.log("CurveZap deploy done()");

    let params = {
        odosRouter: BASE.odosRouterV2
    }

    let zap = await ethers.getContract('CurveZap');

    await (await zap.setParams(params)).wait();
    console.log('CurveZap setParams done()');
};

module.exports.tags = ['CurveZap'];
