const { ethers } = require("hardhat");

let {POLYGON} = require('@overnight-contracts/common/utils/assets');
let {core} = require('@overnight-contracts/common/utils/core');

let arrakisRewards = "0x33d1ad9Cd88A509397CD924C2d7613C285602C20"; // USDC/WETH
let arrakisVault = "0xA173340f1E942c2845bcBCe8EBD411022E18EB13";  // USDC/WETH
let oracleChainlinkEth = "0xF9680D99D6C9589e2a93a78A04A279e509205945"; // Chainlink: ETH/USD Price Feed 
let eModeCategoryId = 0;
let liquidationThreshold = 850;
let healthFactor = 1500;
let usdcTokenInversion = 0;
let balancingDelta = 10;
let interestRateMode = 2;
let referralCode = 0;


module.exports = async () => {

    const strategy = await ethers.getContract("StrategyArrakisWeth");

    await (await strategy.setTokens(POLYGON.usdc, POLYGON.weth, POLYGON.wMatic, POLYGON.amUsdc)).wait();
    await (await strategy.setParams(
        POLYGON.arrakisRouter,
        arrakisRewards,
        arrakisVault,
        POLYGON.balancerVault,
        POLYGON.balancerPoolIdWmaticUsdcWethBal,
        POLYGON.balancerPoolIdWmaticUsdcWethBal,
        usdcTokenInversion)).wait();
    await (await strategy.setAaveParams(
            POLYGON.aaveProvider,
            POLYGON.oracleChainlinkUsdc,
            oracleChainlinkEth,
            eModeCategoryId,
            liquidationThreshold,
            healthFactor,
            balancingDelta,
            interestRateMode,
            referralCode)).wait();
    await (await strategy.setPortfolioManager(core.pm)).wait();

    console.log('StrategyArrakisWeth setting done');
};

module.exports.tags = ['setting', 'StrategyArrakisWethSetting'];
