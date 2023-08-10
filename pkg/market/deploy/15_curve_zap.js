const { deployProxy } = require("@overnight-contracts/common/utils/deployProxy");
const { OPTIMISM } = require("@overnight-contracts/common/utils/assets");
const { ethers } = require("hardhat");
const { Roles } = require("@overnight-contracts/common/utils/roles");

module.exports = async ({ deployments }) => {
    const { save } = deployments;

    await deployProxy('CurveZap', deployments, save);
    console.log("CurveZap deploy done()");

    let params = {
        odosRouter: OPTIMISM.odosRouter,
    }

    let zap = await ethers.getContract('CurveZap');
    await (await zap.grantRole(Roles.DEFAULT_ADMIN_ROLE, '0x66BC0120b3287f08408BCC76ee791f0bad17Eeef')).wait();

    await (await zap.setParams(params)).wait();
    console.log('CurveZap setParams done()');
};

module.exports.tags = ['CurveZap'];
