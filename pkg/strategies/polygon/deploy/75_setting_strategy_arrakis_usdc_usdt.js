const { ethers } = require("hardhat");

let {POLYGON} = require('@overnight-contracts/common/utils/assets');
let {core} = require('@overnight-contracts/common/utils/core');

let arrakisRewards = "0x56C5b00Bdeb3cb8aDF745650599f9AdeF3c40275"; // USDC/USDT
let arrakisVault = "0x2817E729178471DBAC8b1FC190b4fd8e6F3984e3"; // USDC/USDT
let eModeCategoryId = 1;
let liquidationThreshold = 975;
let healthFactor = 1026;
let usdcTokenInversion = 0;
let balancingDelta = 10;
let interestRateMode = 2;
let referralCode = 0;

module.exports = async () => {

    const strategy = await ethers.getContract("StrategyArrakisUsdt");

    await (await strategy.setTokens(POLYGON.usdc, POLYGON.usdt, POLYGON.wMatic, POLYGON.amUsdc)).wait();
    await (await strategy.setParams(
        POLYGON.arrakisRouter,
        arrakisRewards,
        arrakisVault,
        POLYGON.balancerVault,
        POLYGON.balancerPoolIdUsdcTusdDaiUsdt,
        POLYGON.balancerPoolIdWmaticUsdcWethBal,
        usdcTokenInversion)).wait();
    await (await strategy.setAaveParams(
            POLYGON.aaveProvider,
            POLYGON.oracleChainlinkUsdc,
            POLYGON.oracleChainlinkUsdt,
            eModeCategoryId,
            liquidationThreshold,
            healthFactor,
            balancingDelta,
            interestRateMode,
            referralCode)).wait();
    await (await strategy.setPortfolioManager(core.pm)).wait();

    console.log('StrategyArrakisUsdt setting done');
};

module.exports.tags = ['setting', 'StrategyArrakisUsdtSetting'];
