const { deployProxy } = require("@overnight-contracts/common/utils/deployProxy");
const { ARBITRUM } = require("@overnight-contracts/common/utils/assets");
const { ethers } = require("hardhat");
const { Roles } = require("@overnight-contracts/common/utils/roles");

module.exports = async ({ deployments }) => {
    const { save } = deployments;

    await deployProxy('HorizaZap', deployments, save);
    console.log("HorizaZap deploy done()");

    let params = {
        odosRouter: ARBITRUM.odosRouterV2,
        npm: ARBITRUM.horizaNpm
    }

    let zap = await ethers.getContract('HorizaZap');

    await (await zap.setParams(params)).wait();
    console.log('HorizaZap setParams done()');
};

module.exports.tags = ['HorizaZap'];
