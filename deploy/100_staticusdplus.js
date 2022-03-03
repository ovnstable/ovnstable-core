const {ethers} = require("hardhat");
const fs = require("fs");


module.exports = async ({getNamedAccounts, deployments}) => {
    const {deploy} = deployments;
    const {deployer} = await getNamedAccounts();

    const usdPlus = await ethers.getContract("UsdPlusToken");

    await deploy('StaticUsdPlusToken', {
        from: deployer,
        args: [usdPlus.address],
        log: true,
    });
};

module.exports.tags = ['StaticUsdPlusToken'];
module.exports.dependencies = ["SettingUsdPlusToken", "SettingExchange"];
