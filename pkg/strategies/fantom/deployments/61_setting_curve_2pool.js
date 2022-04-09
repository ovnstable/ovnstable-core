const {ethers} = require("hardhat");

let {FANTOM} = require('../../../common/utils/assets');
let {core} = require('../../../common/utils/core');

let uniswapRouter = "0xF491e7B69E4244ad4002BC14e878a34207E38c29";

module.exports = async () => {

    const strategy = await ethers.getContract("StrategyCurve2Pool");

    await (await strategy.setTokens(FANTOM.usdc, FANTOM.crv2PoolToken, FANTOM.crv2PoolGauge, FANTOM.crv, FANTOM.wFtm)).wait();
    await (await strategy.setParams(FANTOM.crv2Pool, FANTOM.crv2PoolGauge, uniswapRouter)).wait();
    await (await strategy.setPortfolioManager(core.pm)).wait();

    console.log('StrategyCurve2Pool setting done');
};

module.exports.tags = ['setting', 'StrategyCurve2PoolSetting'];

