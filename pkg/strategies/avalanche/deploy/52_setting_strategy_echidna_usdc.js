const {ethers} = require("hardhat");

let {AVALANCHE} = require('@overnight-contracts/common/utils/assets');
let {core} = require('@overnight-contracts/common/utils/core');

let ptpToken = "0x22d4002028f537599bE9f666d1c4Fa138522f9c8";
let platypusLPUsdc = "0xAEf735B1E7EcfAf8209ea46610585817Dc0a2E16";
let booster = "0x1c898b4e77843aa3057d69350cd147c4ffdef93f";
let rewardPool = "0x2495dBA5D0e10B20f70c51dd42089e98a3D155F1";
let pid = 4;

module.exports = async () => {
    const strategy = await ethers.getContract("StrategyEchidnaUsdc");

    await (await strategy.setTokens(AVALANCHE.usdc, AVALANCHE.wAvax, ptpToken, platypusLPUsdc)).wait();
    await (await strategy.setParams(AVALANCHE.traderJoeRouter, booster, rewardPool, pid)).wait();
    await (await strategy.setPortfolioManager(core.pm)).wait();

    console.log('StrategyEchidnaUsdc setting done');
};

module.exports.tags = ['setting', 'StrategyEchidnaUsdcSetting'];
