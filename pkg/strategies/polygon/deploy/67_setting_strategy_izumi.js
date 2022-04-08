const { ethers } = require("hardhat");

let {POLYGON} = require('../../../common/utils/assets');
let {core} = require('../../../common/utils/core');

let uniswapV3PositionManager = "0xc36442b4a4522e871399cd717abdd847ab11fe88";
let uniswapV3Pool = "0x3F5228d0e7D75467366be7De2c31D0d098bA2C23";
let uniswapV3Router = "0xE592427A0AEce92De3Edee1F18E0157C05861564";
let izumiBoost = "0x01cc44fc1246d17681b325926865cdb6242277a5";
let uniswapNftToken = "0xC36442b4a4522E871399CD717aBDD847Ab11FE88";
let balancerPoolId = "0x0d34e5dd4d8f043557145598e4e2dc286b35fd4f000000000000000000000068";
let balancerVault = "0xBA12222222228d8Ba445958a75a0704d566BF2C8";
let aaveCurve = "0x445fe580ef8d70ff569ab36e80c647af338db351";

module.exports = async () => {

    const strategy = await ethers.getContract("StrategyIzumi");

    await (await strategy.setTokens(POLYGON.usdc, POLYGON.usdt, POLYGON.izi, POLYGON.yin, uniswapNftToken, POLYGON.weth)).wait();
    await (await strategy.setParams(uniswapV3PositionManager, uniswapV3Pool,  izumiBoost, uniswapV3Router, balancerPoolId, balancerVault, aaveCurve)).wait();
    await (await strategy.setPortfolioManager(core.pm)).wait();

    console.log('StrategyIzumi setting done');
};

module.exports.tags = ['setting', 'StrategyIzumiSetting'];

