const {ethers} = require("hardhat");

let {FANTOM} = require('@overnight-contracts/common/utils/assets');
let {core} = require('@overnight-contracts/common/utils/core');

module.exports = async () => {
    const strategy = await ethers.getContract("StrategyBeethovenxDeiUsdc");

    await (await strategy.setTokens(FANTOM.usdc, FANTOM.bptDeiUsdc, FANTOM.beets, FANTOM.deus, FANTOM.wFtm)).wait();
    await (await strategy.setParams(FANTOM.beethovenxVault, FANTOM.beethovenxMasterChef, FANTOM.poolIdDeiUsdc,
        FANTOM.poolIdBeetsWFtm, FANTOM.poolIdDeusWFtm, FANTOM.poolIdWFtmUsdc, FANTOM.pidBeethovenxDeiUsdc)).wait();
    await (await strategy.setPortfolioManager(core.pm)).wait();

    console.log('StrategyBeethovenxDeiUsdc setting done');
};

module.exports.tags = ['setting', 'StrategyBeethovenxDeiUsdcSetting'];

