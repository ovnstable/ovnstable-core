const {deployProxyWithArgs} = require("@overnight-contracts/common/utils/deployProxy");
const {ethers} = require("hardhat");

module.exports = async ({getNamedAccounts, deployments}) => {
    const {save} = deployments;

    const mockUsdPlusToken = await ethers.getContract("MockUsdPlusToken");

    await deployProxyWithArgs('WrappedUsdPlusToken', deployments, save, {}, [], [mockUsdPlusToken.address]);

    console.log("MockWrappedUsdPlusToken created");
};

module.exports.tags = ['test', 'MockWrappedUsdPlusToken'];
