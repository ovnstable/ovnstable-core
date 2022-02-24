const { ethers } = require("hardhat");

const fs = require("fs");
let assets = JSON.parse(fs.readFileSync('./assets.json'));

let aaveAddress = "0xd05e3E715d945B59290df0ae8eF85c1BdB684744";
let aCurvepoolStake = "0x445FE580eF8d70FF569aB36e80c647af338db351";
let uniswapRouter = "0xa5e0829caced8ffdd4de3c43696c57f7d7a678ff";

module.exports = async ({getNamedAccounts, deployments}) => {
    const {deploy} = deployments;
    const {deployer} = await getNamedAccounts();

    const strategy = await ethers.getContract("StrategyCurve");
    const pm = await ethers.getContract("PortfolioManager");

    await (await strategy.setTokens(assets.usdc, assets.am3CRV, assets.am3CRVgauge, assets.crv, assets.wMatic)).wait();
    await (await strategy.setParams(aCurvepoolStake, assets.am3CRVgauge, uniswapRouter)).wait();
    await (await strategy.setPortfolioManager(pm.address)).wait();

    console.log('StrategyCurve setting done');
};

module.exports.tags = ['setting', 'StrategyCurveSetting'];

