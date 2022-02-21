const { ethers } = require("hardhat");

const fs = require("fs");
let assets = JSON.parse(fs.readFileSync('./assets.json'));



let uniswapV3PositionManager = "0xc36442b4a4522e871399cd717abdd847ab11fe88";
let uniswapV3Pool = "0x3F5228d0e7D75467366be7De2c31D0d098bA2C23";
let uniswapV2Router = "0xa5e0829caced8ffdd4de3c43696c57f7d7a678ff";
let uniswapV3Router = "0xE592427A0AEce92De3Edee1F18E0157C05861564";
let izumiBoost = "0x01cc44fc1246d17681b325926865cdb6242277a5";
let uniswapNftToken = "0xC36442b4a4522E871399CD717aBDD847Ab11FE88";
module.exports = async ({getNamedAccounts, deployments}) => {
    const {deploy} = deployments;
    const {deployer} = await getNamedAccounts();

    const strategy = await ethers.getContract("StrategyIzumi");
    const pm = await ethers.getContract("PortfolioManager");

    await (await strategy.setTokens(assets.usdc, assets.usdt, assets.izi, assets.yin, uniswapNftToken, assets.weth)).wait();
    await (await strategy.setParams(uniswapV3PositionManager, uniswapV3Pool, uniswapV2Router, izumiBoost, uniswapV3Router)).wait();
    await (await strategy.setPortfolioManager(pm.address)).wait();

    console.log('StrategyIzumi setting done');
};

module.exports.tags = ['setting', 'StrategyIzumiSetting'];

