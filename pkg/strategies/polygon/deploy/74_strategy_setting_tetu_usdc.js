const {ethers} = require("hardhat");

let { POLYGON } = require('@overnight-contracts/common/utils/assets');
let { core } = require('@overnight-contracts/common/utils/core');

let usdcSmartVault = '0xeE3B4Ce32A6229ae15903CDa0A5Da92E739685f7';
let xTetuSmartVault = '0x225084D30cc297F3b177d9f93f5C3Ab8fb6a1454';
let tetuSwapRouter = '0xBCA055F25c3670fE0b1463e8d470585Fe15Ca819';

module.exports = async () => {
    const strategy = await ethers.getContract("StrategyTetuUsdc");

    await (await strategy.setTokens(POLYGON.usdc, POLYGON.tetu)).wait();
    await (await strategy.setParams(usdcSmartVault, xTetuSmartVault, tetuSwapRouter)).wait();
    await (await strategy.setPortfolioManager(core.pm)).wait();

    console.log('StrategyTetuUsdc setting done');
};

module.exports.tags = ['setting', 'StrategyTetuUsdcSetting'];

