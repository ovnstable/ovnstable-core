const {ethers} = require("hardhat");

let {FANTOM} = require('@overnight-contracts/common/utils/assets');
let {core} = require('@overnight-contracts/common/utils/core');

module.exports = async () => {
    const strategy = await ethers.getContract("StrategyCream");

    await (await strategy.setTokens(FANTOM.usdc, FANTOM.creamTokenAndDelegator)).wait();
    await (await strategy.setParams(FANTOM.creamTokenAndDelegator)).wait();
    await (await strategy.setPortfolioManager(core.pm)).wait();

    console.log('StrategyCream setting done');
};

module.exports.tags = ['setting', 'StrategyCreamSetting'];

