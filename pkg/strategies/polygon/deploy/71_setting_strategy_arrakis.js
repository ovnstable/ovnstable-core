const { ethers } = require("hardhat");

let {POLYGON} = require('@overnight-contracts/common/utils/assets');
let {core} = require('@overnight-contracts/common/utils/core');


let arrakisRewards = "0x50be234a8405c32c15712850377deec768628bc9"; // USDC/USDT
let arrakisRouter = "0xbc91a120ccd8f80b819eaf32f0996dac3fa76a6c";
let arrakisVault = "0x869A75D6F7ae09810c9083684cf22e9A618c8B05";


module.exports = async () => {

    const strategy = await ethers.getContract("StrategyArrakis");

    await (await strategy.setTokens(POLYGON.usdc, POLYGON.usdt, POLYGON.wMatic)).wait();
    await (await strategy.setParams(
        arrakisRouter,
        arrakisRewards,
        arrakisVault,
        POLYGON.balancerVault,
        POLYGON.balancerPoolIdUsdcTusdDaiUsdt,
        POLYGON.balancerPoolIdWmaticUsdcWethBal,
        POLYGON.uniswapV3PositionManager)).wait();
    await (await strategy.setPortfolioManager(core.pm)).wait();

    console.log('StrategyArrakis setting done');
};

module.exports.tags = ['setting', 'StrategyArrakisSetting'];
