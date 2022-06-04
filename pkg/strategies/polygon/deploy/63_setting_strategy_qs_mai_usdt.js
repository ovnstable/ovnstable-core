const { ethers } = require("hardhat");

let {POLYGON} = require('@overnight-contracts/common/utils/assets');
let {core} = require('@overnight-contracts/common/utils/core');

module.exports = async () => {
    const strategy = await ethers.getContract("StrategyQsMaiUsdt");

    // await (await strategy.setParams(aaveAddress, assets.usdc, assets.amUsdc)).wait();

    console.log('StrategyQsMaiUsdt setting done')
};

module.exports.tags = ['setting','StrategyQsMaiUsdtSetting'];

