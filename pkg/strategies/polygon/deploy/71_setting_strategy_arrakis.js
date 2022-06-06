const { ethers } = require("hardhat");

let {POLYGON} = require('@overnight-contracts/common/utils/assets');
let {core} = require('@overnight-contracts/common/utils/core');


let arrakisRewards = "0x56C5b00Bdeb3cb8aDF745650599f9AdeF3c40275"; // USDC/USDT
let arrakisVault = "0x2817E729178471DBAC8b1FC190b4fd8e6F3984e3";


module.exports = async () => {

    const strategy = await ethers.getContract("StrategyArrakis");

    await (await strategy.setTokens(POLYGON.usdc, POLYGON.usdt, POLYGON.wMatic)).wait();
    await (await strategy.setParams(
        POLYGON.arrakisRouter,
        arrakisRewards,
        arrakisVault,
        POLYGON.balancerVault,
        POLYGON.balancerPoolIdUsdcTusdDaiUsdt,
        POLYGON.balancerPoolIdWmaticUsdcWethBal,
        POLYGON.uniswapV3PositionManager,
        POLYGON.oracleChainlinkUsdc,
        POLYGON.oracleChainlinkUsdt
        )).wait();
    await (await strategy.setPortfolioManager(core.pm)).wait();

    console.log('StrategyArrakis setting done');
};

module.exports.tags = ['setting', 'StrategyArrakisSetting'];
