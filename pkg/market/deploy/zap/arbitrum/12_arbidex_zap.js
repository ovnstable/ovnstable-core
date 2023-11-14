const { deployProxy } = require("@overnight-contracts/common/utils/deployProxy");
const { ARBITRUM } = require("@overnight-contracts/common/utils/assets");
const { ethers } = require("hardhat");
const { Roles } = require("@overnight-contracts/common/utils/roles");

module.exports = async ({ deployments }) => {
    const { save } = deployments;

    await deployProxy('ArbidexZap', deployments, save);
    console.log("ArbidexZap deploy done()");

    let params = {
        odosRouter: ARBITRUM.odosRouterV2,
        arbidexRouter: ARBITRUM.arbidexRouter
    }

    let zap = await ethers.getContract('ArbidexZap');

    await (await zap.setParams(params)).wait();
    console.log('ArbidexZap setParams done()');
};

module.exports.tags = ['ArbidexZap'];
