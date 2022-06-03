const { ethers } = require("hardhat");

let {POLYGON} = require('@overnight-contracts/common/utils/assets');
let {core} = require('@overnight-contracts/common/utils/core');

module.exports = async () => {
    const strategy = await ethers.getContract("StrategyIzumi");

    await (await strategy.setTokens(POLYGON.usdc, POLYGON.usdt, POLYGON.izi, POLYGON.yin, POLYGON.uniswapNftToken, POLYGON.weth)).wait();
    await (await strategy.setParams(POLYGON.uniswapV3PositionManager, POLYGON.uniswapV3Pool, POLYGON.izumiBoost,
        POLYGON.uniswapV3Router, POLYGON.balancerPoolIdUsdcTusdDaiUsdt, POLYGON.balancerVault, POLYGON.aaveCurve, POLYGON.quickSwapRouter)).wait();
    await (await strategy.setPortfolioManager(core.pm)).wait();

    console.log('StrategyIzumi setting done');
};

module.exports.tags = ['setting', 'StrategyIzumiSetting'];

