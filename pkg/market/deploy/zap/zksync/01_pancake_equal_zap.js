const {
    deployProxy,
} = require("@overnight-contracts/common/utils/deployProxy");
const { ZKSYNC } = require("@overnight-contracts/common/utils/assets");
const { ethers } = require("hardhat");
const { Roles } = require("@overnight-contracts/common/utils/roles");

module.exports = async ({ deployments }) => {
    const { save } = deployments;

    await deployProxy("PancakeEqualZap", deployments, save);
    console.log("PancakeEqualZap deploy done()");

    let params = {
        odosRouter: ZKSYNC.odosRouterV2,
        npm: ZKSYNC.pancakeNpm,
    };

    let zap = await ethers.getContract("PancakeEqualZap");

    await (await zap.setParams(params)).wait();
    console.log("PancakeEqualZap setParams done()");
};

module.exports.tags = ["PancakeEqualZapZk"];
