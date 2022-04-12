const { ethers } = require("hardhat");

let {POLYGON} = require('../../../common/utils/assets');
let {core} = require('../../../common/utils/core');

module.exports = async () => {
    const strategy = await ethers.getContract("StrategyDodoUsdt");

    await (await strategy.setTokens(POLYGON.usdc, POLYGON.usdt, POLYGON.dodo, POLYGON.usdcLPToken, POLYGON.usdtLPToken)).wait();
    await (await strategy.setParams(POLYGON.dodoV1UsdcUsdtPool, POLYGON.dodoV2DodoUsdtPool, POLYGON.dodoMine, POLYGON.dodoV1Helper,
        POLYGON.dodoProxy, POLYGON.dodoApprove, POLYGON.balancerVault, POLYGON.balancerPoolIdUsdcTusdDaiUsdt)).wait();
    await (await strategy.setPortfolioManager(core.pm)).wait();

    console.log('StrategyDodoUsdt setting done');
};

module.exports.tags = ['setting', 'StrategyDodoUsdtSetting'];
