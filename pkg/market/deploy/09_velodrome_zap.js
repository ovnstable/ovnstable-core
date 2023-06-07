const { deployProxy } = require("@overnight-contracts/common/utils/deployProxy");
const { ARBITRUM, OPTIMISM } = require("@overnight-contracts/common/utils/assets");
const { ethers } = require("hardhat");

module.exports = async ({ deployments }) => {
    const { save } = deployments;

    await deployProxy('VelodromeZap', deployments, save);
    console.log("VelodromeZap deploy done()");

    let params = {
        odosRouter: OPTIMISM.odosRouter,
        velodromeRouter: OPTIMISM.velodromeRouter
    }

    let zap = await ethers.getContract('VelodromeZap');

    await (await zap.setParams(params)).wait();
    console.log('VelodromeZap setParams done()');
};

module.exports.tags = ['VelodromeZap'];
