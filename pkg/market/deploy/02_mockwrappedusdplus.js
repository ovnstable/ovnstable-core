const {deployProxyWithArgs} = require("@overnight-contracts/common/utils/deployProxy");
const {ethers} = require("hardhat");

module.exports = async ({getNamedAccounts, deployments}) => {
    const {save} = deployments;

    const mockUsdPlusToken = await ethers.getContract("MockUsdPlusToken");

    let params = {factoryOptions:{}, unsafeAllow:[], args:[mockUsdPlusToken.address]};

    await deployProxyWithArgs('WrappedUsdPlusToken', deployments, save, params);

    console.log("MockWrappedUsdPlusToken created");
};

module.exports.tags = ['test', 'MockWrappedUsdPlusToken'];
