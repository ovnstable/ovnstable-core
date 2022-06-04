const { ethers } = require("hardhat");

let {POLYGON} = require('@overnight-contracts/common/utils/assets');
let {core} = require('@overnight-contracts/common/utils/core');

module.exports = async () => {
    const strategy = await ethers.getContract("StrategyMStable");

    await (await strategy.setTokens(POLYGON.usdc, POLYGON.mUsd, POLYGON.imUsd, POLYGON.vimUsd, POLYGON.mta, POLYGON.wMatic)).wait();
    await (await strategy.setParams(POLYGON.balancerVault, POLYGON.quickSwapRouter, POLYGON.balancerPoolIdWmaticMtaWeth,
        POLYGON.balancerPoolIdWmaticUsdcWethBal)).wait();
    await (await strategy.setPortfolioManager(core.pm)).wait();

    console.log('StrategyMStable setting done');
};

module.exports.tags = ['setting', 'StrategyMStableSetting'];

