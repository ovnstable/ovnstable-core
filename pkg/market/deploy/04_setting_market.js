const { ethers } = require("hardhat");

let {POLYGON} = require('@overnight-contracts/common/utils/assets');

let exchange = '0x6B3712943A913EB9A22B71D4210DE6158c519970';
let usdPlusToken = '0x236eeC6359fb44CCe8f97E99387aa7F8cd5cdE1f';

module.exports = async ({getNamedAccounts, deployments}) => {
    const {deploy} = deployments;
    const {deployer} = await getNamedAccounts();

    const market = await ethers.getContract("Market");

    const mockUsdPlusToken = await ethers.getContract("MockUsdPlusToken");
    const staticUsdPlusToken = await ethers.getContract("StaticUsdPlusToken");

    await (await market.setTokens(POLYGON.usdc, usdPlusToken, staticUsdPlusToken.address)).wait();
    await (await market.setParams(exchange)).wait();

    console.log("Market settings done");
};

module.exports.tags = ['setting', 'SettingMarket'];
