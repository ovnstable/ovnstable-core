const {ethers} = require("hardhat");

let {FANTOM} = require('../../../common/utils/assets');
let {core} = require('../../../common/utils/core');

module.exports = async () => {
    const strategy = await ethers.getContract("StrategyCurveGeist");

    await (await strategy.setTokens(FANTOM.usdc, FANTOM.crvGeistToken, FANTOM.crvGeistGauge, FANTOM.geist, FANTOM.crv, FANTOM.wFtm)).wait();
    await (await strategy.setParams(FANTOM.crvGeist, FANTOM.crvGeistGauge, FANTOM.spookySwapRouter)).wait();
    await (await strategy.setPortfolioManager(core.pm)).wait();

    console.log('StrategyCurveGeist setting done');
};

module.exports.tags = ['setting', 'StrategyCurveGeistSetting'];

