const { deployProxy } = require("@overnight-contracts/common/utils/deployProxy");
const { ARBITRUM } = require("@overnight-contracts/common/utils/assets");
const { ethers } = require("hardhat");
const { Roles } = require("@overnight-contracts/common/utils/roles");

module.exports = async ({ deployments }) => {
    const { save } = deployments;

    await deployProxy('PancakeEqualZap', deployments, save);
    console.log("PancakeEqualZap deploy done()");

    let params = {
        odosRouter: ARBITRUM.odosRouterV2,
        npm: ARBITRUM.pancakeNpm
    }

    let zap = await ethers.getContract('PancakeEqualZap');

    await (await zap.setParams(params)).wait();
    console.log('PancakeEqualZap setParams done()');
};

module.exports.tags = ['PancakeEqualZap'];
