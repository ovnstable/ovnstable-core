const { deployProxy } = require("@overnight-contracts/common/utils/deployProxy");
const { ARBITRUM, OPTIMISM, BSC } = require("@overnight-contracts/common/utils/assets");
const { ethers } = require("hardhat");
const { Roles } = require("@overnight-contracts/common/utils/roles");

module.exports = async ({ deployments }) => {
    const { save } = deployments;

    await deployProxy('ThenaZap', deployments, save);
    console.log("ThenaZap deploy done()");

    let params = {
        odosRouter: BSC.odosRouter,
        thenaRouter: BSC.thenaRouter
    }

    let zap = await ethers.getContract('ThenaZap');
    await (await zap.grantRole(Roles.DEFAULT_ADMIN_ROLE, '0x5CB01385d3097b6a189d1ac8BA3364D900666445')).wait();

    await (await zap.setParams(params)).wait();
    console.log('ThenaZap setParams done()');
};

module.exports.tags = ['ThenaZap'];
