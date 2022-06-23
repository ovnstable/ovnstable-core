const {deployProxyWithArgs} = require("@overnight-contracts/common/utils/deployProxy");
const {ethers} = require("hardhat");

module.exports = async ({getNamedAccounts, deployments}) => {
    const {save} = deployments;

    const usdPlusToken = await ethers.getContract("UsdPlusToken");

    let params = {factoryOptions:{}, unsafeAllow:[], args:[usdPlusToken.address]};

    await deployProxyWithArgs('WrappedUsdPlusToken', deployments, save, params);

    console.log("WrappedUsdPlusToken created");
};

module.exports.tags = ['base', 'WrappedUsdPlusToken'];
