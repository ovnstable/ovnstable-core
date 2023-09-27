const { deployProxy } = require("@overnight-contracts/common/utils/deployProxy");
const { OPTIMISM } = require("@overnight-contracts/common/utils/assets");
const { ethers } = require("hardhat");
const { Roles } = require("@overnight-contracts/common/utils/roles");

module.exports = async ({ deployments }) => {
    const { save } = deployments;

    await deployProxy('BeefyVelodromeZap', deployments, save);
    console.log("BeefyVelodromeZap deploy done()");

    let params = {
        odosRouter: OPTIMISM.odosRouterV2,
        velodromeRouter: OPTIMISM.velodromeRouterV2
    }

    let zap = await ethers.getContract('BeefyVelodromeZap');
    await (await zap.grantRole(Roles.DEFAULT_ADMIN_ROLE, '0x5CB01385d3097b6a189d1ac8BA3364D900666445')).wait();

    await (await zap.setParams(params)).wait();
    console.log('BeefyVelodromeZap setParams done()');
};

module.exports.tags = ['BeefyVelodromeZap'];
