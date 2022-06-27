const {deployProxy} = require("@overnight-contracts/common/utils/deployProxy");
const {ethers} = require("hardhat");

module.exports = async ({getNamedAccounts, deployments}) => {
    const {save} = deployments;

    const mockUsdPlusToken = await ethers.getContract("MockUsdPlusToken");

    let params = { args: [mockUsdPlusToken.address] };

    await deployProxy('WrappedUsdPlusToken', deployments, save, params);

    console.log("WrappedUsdPlusTokenForTest created");
};

module.exports.tags = ['test', 'WrappedUsdPlusTokenForTest'];
