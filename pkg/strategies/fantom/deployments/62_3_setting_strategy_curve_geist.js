const { ethers } = require("hardhat");

const fs = require("fs");
let assets = JSON.parse(fs.readFileSync('./fantom_assets.json'));

let uniswapRouter = "0xF491e7B69E4244ad4002BC14e878a34207E38c29";

module.exports = async ({getNamedAccounts, deployments}) => {
    const {deploy} = deployments;
    const {deployer} = await getNamedAccounts();

    const strategy = await ethers.getContract("FantomStrategyCurveGeist");
    const pm = await ethers.getContract("PortfolioManager");

    await (await strategy.setTokens(assets.usdc, assets.crvGeistToken, assets.crvGeistGauge, assets.geist, assets.crv, assets.wFtm)).wait();
    await (await strategy.setParams(assets.crvGeist, assets.crvGeistGauge, uniswapRouter)).wait();
    await (await strategy.setPortfolioManager(pm.address)).wait();

    console.log('FantomStrategyCurveGeist setting done');
};

module.exports.tags = ['setting', 'FantomStrategyCurveGeistSetting'];

