const { deployProxy } = require("@overnight-contracts/common/utils/deployProxy");
const { OPTIMISM } = require("@overnight-contracts/common/utils/assets");
const { ethers } = require("hardhat");
const { Roles } = require("@overnight-contracts/common/utils/roles");

module.exports = async ({ deployments }) => {
    const { save } = deployments;

    await deployProxy('DefiedgeZap', deployments, save);
    console.log("DefiedgeZap deploy done()");

    let params = {
        odosRouter: OPTIMISM.odosRouterV2,
    }

    let zap = await ethers.getContract('DefiedgeZap');
    await (await zap.grantRole(Roles.DEFAULT_ADMIN_ROLE, '0x66BC0120b3287f08408BCC76ee791f0bad17Eeef')).wait();

    await (await zap.setParams(params)).wait();
    console.log('DefiedgeZap setParams done()');
};

module.exports.tags = ['DefiedgeZap'];
