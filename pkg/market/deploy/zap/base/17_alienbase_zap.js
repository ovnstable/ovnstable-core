const { deployProxy } = require("@overnight-contracts/common/utils/deployProxy");
const { BASE } = require("@overnight-contracts/common/utils/assets");
const { ethers } = require("hardhat");
const { Roles } = require("@overnight-contracts/common/utils/roles");

module.exports = async ({ deployments }) => {
    const { save } = deployments;

    let deployResult = await deployProxy('AlienBaseZap', deployments, save);
    let params = {
        alienBaseRouter: BASE.alienBaseRouter,
        odosRouter: BASE.odosRouterV2
    }

    let zap = await ethers.getContract('AlienBaseZap');
    await (await zap.setParams(params)).wait();
};

module.exports.tags = ['AlienBaseZap'];
