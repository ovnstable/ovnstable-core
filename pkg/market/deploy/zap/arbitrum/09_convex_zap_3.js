const { deployProxy } = require("@overnight-contracts/common/utils/deployProxy");
const { ARBITRUM } = require("@overnight-contracts/common/utils/assets");
const { ethers } = require("hardhat");

module.exports = async ({ deployments }) => {
    const { save } = deployments;

    await deployProxy('ConvexZap3', deployments, save);
    console.log("ConvexZap3 deploy done()");

    let params = {
        odosRouter: ARBITRUM.odosRouterV2,
    }

    let zap = await ethers.getContract('ConvexZap3');
    await (await zap.setParams(params)).wait();
    console.log('ConvexZap3 setParams done()');
};

module.exports.tags = ['ConvexZap3'];
