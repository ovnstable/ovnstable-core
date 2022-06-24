const {getContract} = require("@overnight-contracts/common/utils/script-utils");
const { ethers } = require("hardhat");

let {POLYGON} = require('@overnight-contracts/common/utils/assets');

module.exports = async ({getNamedAccounts, deployments}) => {
    const {deploy} = deployments;
    const {deployer} = await getNamedAccounts();

    const market = await ethers.getContract("Market");
    const exchange = await getContract("Exchange");
    const usdPlusToken = await getContract("UsdPlusToken");
    const wrappedUsdPlusToken = await ethers.getContract("WrappedUsdPlusToken");

    await (await market.setTokens(POLYGON.usdc, usdPlusToken.address, wrappedUsdPlusToken.address)).wait();
    await (await market.setParams(exchange.address)).wait();

    console.log("Market settings done");
};

module.exports.tags = ['setting', 'SettingMarket'];
