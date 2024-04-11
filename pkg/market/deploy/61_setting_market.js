const {getContract} = require("@overnight-contracts/common/utils/script-utils");
const hre, { ethers } = require("hardhat");

module.exports = async ({getNamedAccounts, deployments}) => {

    const market = await getContract("Market", hre.network.name);
    const exchange = await getContract("Exchange");
    const usdPlusToken = await getContract("UsdPlusToken", hre.network.name);
    const wrappedUsdPlusToken = await getContract("WrappedUsdPlusToken", hre.network.name); 

     let asset = await exchange.usdc();
    await (await market.setTokens(asset, usdPlusToken.address, wrappedUsdPlusToken.address)).wait();
    await (await market.setParams(exchange.address)).wait(); 

    console.log("Market settings done");
};

module.exports.tags = ['setting', 'SettingMarket'];
