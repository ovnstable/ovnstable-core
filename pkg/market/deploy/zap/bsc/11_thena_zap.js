const { deployProxy } = require("@overnight-contracts/common/utils/deployProxy");
const { ARBITRUM, OPTIMISM, BSC } = require("@overnight-contracts/common/utils/assets");
const { ethers } = require("hardhat");
const { Roles } = require("@overnight-contracts/common/utils/roles");

module.exports = async ({ deployments }) => {
    const { save } = deployments;

    await deployProxy('ThenaZap', deployments, save);
    console.log("ThenaZap deploy done()");

    let params = {
        odosRouter: BSC.odosRouterV2,
        thenaRouter: BSC.thenaRouter
    }

    let zap = await ethers.getContract('ThenaZap');
    await (await zap.setParams(params)).wait();
    console.log('ThenaZap setParams done()');
};

module.exports.tags = ['ThenaZap'];
