const { deployProxy } = require("@overnight-contracts/common/utils/deployProxy");
const { LINEA } = require("@overnight-contracts/common/utils/assets");
const { ethers } = require("hardhat");

module.exports = async ({ deployments }) => {
    const { save } = deployments;

    await deployProxy('LynexZap', deployments, save);
    console.log("LynexZap deploy done()");

    let params = {
        odosRouter: LINEA.odosRouterV2,
        lynexRouter: LINEA.lynexRouter
    }

    let zap = await ethers.getContract('LynexZap');

    await (await zap.setParams(params)).wait();
    console.log('LynexZap setParams done()');
};

module.exports.tags = ['LynexZap'];
