const {ethers} = require("hardhat");

let {POLYGON} = require('@overnight-contracts/common/utils/assets');
let {core} = require('@overnight-contracts/common/utils/core');

module.exports = async () => {
    const strategy = await ethers.getContract("StrategyCurve");

    await (await strategy.setTokens(POLYGON.usdc, POLYGON.am3CRV, POLYGON.am3CRVgauge, POLYGON.crv, POLYGON.wMatic)).wait();
    await (await strategy.setParams(POLYGON.crvAavePool, POLYGON.am3CRVgauge, POLYGON.quickSwapRouter)).wait();
    await (await strategy.setPortfolioManager(core.pm)).wait();

    console.log('StrategyCurve setting done');
};

module.exports.tags = ['setting', 'StrategyCurveSetting'];

