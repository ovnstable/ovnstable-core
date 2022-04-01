const { ethers } = require("hardhat");

const fs = require("fs");
let assets = JSON.parse(fs.readFileSync('./polygon_assets.json'));

let crvPool = "0x445FE580eF8d70FF569aB36e80c647af338db351";
let uniswapRouter = "0xa5e0829caced8ffdd4de3c43696c57f7d7a678ff";

module.exports = async ({getNamedAccounts, deployments}) => {
    const {deploy} = deployments;
    const {deployer} = await getNamedAccounts();

    const strategy = await ethers.getContract("PolygonStrategyCurve");
    const pm = await ethers.getContract("PortfolioManager");

    await (await strategy.setTokens(assets.usdc, assets.am3CRV, assets.am3CRVgauge, assets.crv, assets.wMatic)).wait();
    await (await strategy.setParams(crvPool, assets.am3CRVgauge, uniswapRouter)).wait();
    await (await strategy.setPortfolioManager(pm.address)).wait();

    console.log('PolygonStrategyCurve setting done');
};

module.exports.tags = ['setting', 'PolygonStrategyCurveSetting'];

