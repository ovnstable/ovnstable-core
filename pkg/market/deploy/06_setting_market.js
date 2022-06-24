const { ethers } = require("hardhat");

let {POLYGON} = require('@overnight-contracts/common/utils/assets');

module.exports = async ({getNamedAccounts, deployments}) => {
    const {deploy} = deployments;
    const {deployer} = await getNamedAccounts();

    const market = await ethers.getContract("Market");

    const mockUsdPlusToken = await ethers.getContract("MockUsdPlusToken");
    const wrappedUsdPlusToken = await ethers.getContract("WrappedUsdPlusToken");
    const mockExchange = await ethers.getContract("MockExchange");

    await (await market.setTokens(POLYGON.usdc, mockUsdPlusToken.address, wrappedUsdPlusToken.address)).wait();
    await (await market.setParams(mockExchange.address)).wait();

    console.log("Market settings done");
};

module.exports.tags = ['setting', 'SettingMarket'];
