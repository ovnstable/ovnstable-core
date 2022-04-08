const {ethers} = require("hardhat");

let {POLYGON} = require('../../../common/utils/assets');
let {core} = require('../../../common/utils/core');

let crvPool = "0x445FE580eF8d70FF569aB36e80c647af338db351";
let uniswapRouter = "0xa5e0829caced8ffdd4de3c43696c57f7d7a678ff";

module.exports = async () => {

    const strategy = await ethers.getContract("StrategyCurve");

    await (await strategy.setTokens(POLYGON.usdc, POLYGON.am3CRV, POLYGON.am3CRVgauge, POLYGON.crv, POLYGON.wMatic)).wait();
    await (await strategy.setParams(crvPool, POLYGON.am3CRVgauge, uniswapRouter)).wait();
    await (await strategy.setPortfolioManager(core.pm)).wait();

    console.log('StrategyCurve setting done');
};

module.exports.tags = ['setting', 'StrategyCurveSetting'];

