const { ethers } = require("hardhat");

const fs = require("fs");
let assets = JSON.parse(fs.readFileSync('./fantom_assets.json'));

let uniswapRouter = "0xF491e7B69E4244ad4002BC14e878a34207E38c29";

module.exports = async ({getNamedAccounts, deployments}) => {
    const {deploy} = deployments;
    const {deployer} = await getNamedAccounts();

    const strategy = await ethers.getContract("FantomStrategyCurve2Pool");
    const pm = await ethers.getContract("PortfolioManager");

    await (await strategy.setTokens(assets.usdc, assets.crv2PoolToken, assets.crv2PoolGauge, assets.crv, assets.wFtm)).wait();
    await (await strategy.setParams(assets.crv2Pool, assets.crv2PoolGauge, uniswapRouter)).wait();
    await (await strategy.setPortfolioManager(pm.address)).wait();

    console.log('FantomStrategyCurve2Pool setting done');
};

module.exports.tags = ['setting', 'FantomStrategyCurve2PoolSetting'];

