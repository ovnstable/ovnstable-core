const {ethers} = require("hardhat");

let {FANTOM} = require('@overnight-contracts/common/utils/assets');
let {core} = require('@overnight-contracts/common/utils/core');

let pidWigoUsdcFUsdt = 4;
let poolIdFUsdtUsdc = "0xd163415bd34ef06f57c58d2aed5a5478afb464cc00000000000000000000000e";

module.exports = async () => {
    const strategy = await ethers.getContract("StrategyWigoUsdcFUsdt");

    await (await strategy.setTokens(FANTOM.fusdt, FANTOM.usdc, FANTOM.wigo)).wait();
    await (await strategy.setParams(FANTOM.WigoRouter, FANTOM.WigoLPUsdcFUsdt, FANTOM.WigoMasterFarmer,
        pidWigoUsdcFUsdt, FANTOM.beethovenxVault, poolIdFUsdtUsdc)).wait();
    await (await strategy.setPortfolioManager(core.pm)).wait();

    console.log('StrategyWigoUsdcFUsdt setting done');
};

module.exports.tags = ['setting', 'StrategyWigoUsdcFUsdtSetting'];
