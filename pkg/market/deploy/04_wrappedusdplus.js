const {deployProxy} = require("@overnight-contracts/common/utils/deployProxy");
const {ethers} = require("hardhat");

module.exports = async ({getNamedAccounts, deployments}) => {
    const {save} = deployments;

    const usdPlusToken = await ethers.getContract("UsdPlusToken");

    let params = { args: [usdPlusToken.address] };

    await deployProxy('WrappedUsdPlusToken', deployments, save, params);

    console.log("WrappedUsdPlusToken created");
};

module.exports.tags = ['base', 'WrappedUsdPlusToken'];
