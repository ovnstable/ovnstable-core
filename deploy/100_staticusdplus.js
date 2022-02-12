const {ethers} = require("hardhat");
const fs = require("fs");

let assets = JSON.parse(fs.readFileSync('./assets.json'));

module.exports = async ({getNamedAccounts, deployments}) => {
    const {deploy} = deployments;
    const {deployer} = await getNamedAccounts();

    const usdPlus = await ethers.getContract("UsdPlusToken");

    await deploy('StaticUsdPlusToken', {
        from: deployer,
        args: [usdPlus.address, assets.usdc],
        log: true,
    });
};

module.exports.tags = ['StaticUsdPlusToken'];
module.exports.dependencies = ["SettingUsdPlusToken", "SettingExchange"];
