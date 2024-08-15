const { deployProxy } = require("@overnight-contracts/common/utils/deployProxy");
const { ARBITRUM } = require("@overnight-contracts/common/utils/assets");
const { ethers } = require("hardhat");
const { Roles } = require("@overnight-contracts/common/utils/roles");

module.exports = async ({ deployments }) => {
    const { save } = deployments;

    await deployProxy('PancakeEqualWideZap', deployments, save);
    console.log("PancakeEqualWideZap deploy done()");

    let params = {
        odosRouter: ARBITRUM.odosRouterV2,
        npm: ARBITRUM.pancakeNpm
    }

    let zap = await ethers.getContract('PancakeEqualWideZap');

    await (await zap.setParams(params)).wait();
    console.log('PancakeEqualWideZap setParams done()');
};

module.exports.tags = ['PancakeEqualWideZap'];
