const {ethers} = require("hardhat");

let {FANTOM} = require('@overnight-contracts/common/utils/assets');
let {core} = require('@overnight-contracts/common/utils/core');

let pidWigoUsdcDai = 3;
let poolIdDaiUsdc = "0xecaa1cbd28459d34b766f9195413cb20122fb942000200000000000000000120";

module.exports = async () => {
    const strategy = await ethers.getContract("StrategyWigoUsdcDai");

    await (await strategy.setTokens(FANTOM.dai, FANTOM.usdc, FANTOM.wigo)).wait();
    await (await strategy.setParams(FANTOM.WigoRouter, FANTOM.WigoLPUsdcDai, FANTOM.WigoMasterFarmer,
        pidWigoUsdcDai, FANTOM.beethovenxVault, poolIdDaiUsdc)).wait();
    await (await strategy.setPortfolioManager(core.pm)).wait();

    console.log('StrategyWigoUsdcDai setting done');
};

module.exports.tags = ['setting', 'StrategyWigoUsdcDaiSetting'];
