const { ethers } = require("hardhat");

let {FANTOM} = require('../../../common/utils/assets');
let {core} = require('../../../common/utils/core');


let uniswapRouter = "0xF491e7B69E4244ad4002BC14e878a34207E38c29";

module.exports = async () => {

    const strategy = await ethers.getContract("StrategyCurveGeist");

    await (await strategy.setTokens(FANTOM.usdc, FANTOM.crvGeistToken, FANTOM.crvGeistGauge, FANTOM.geist, FANTOM.crv, FANTOM.wFtm)).wait();
    await (await strategy.setParams(FANTOM.crvGeist, FANTOM.crvGeistGauge, uniswapRouter)).wait();
    await (await strategy.setPortfolioManager(core.pm)).wait();

    console.log('StrategyCurveGeist setting done');
};

module.exports.tags = ['setting', 'StrategyCurveGeistSetting'];

