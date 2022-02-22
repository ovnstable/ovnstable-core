const { ethers } = require("hardhat");

const fs = require("fs");
let assets = JSON.parse(fs.readFileSync('./assets.json'));

let pair = "0xE89faE1B4AdA2c869f05a0C96C87022DaDC7709a";
let router = "0xa5e0829caced8ffdd4de3c43696c57f7d7a678ff";

module.exports = async ({getNamedAccounts, deployments}) => {
    const {deploy} = deployments;
    const {deployer} = await getNamedAccounts();

    const strategy = await ethers.getContract("StrategyQsMaiUsdt");
    await (await strategy.setTokens(assets.mai, assets.usdt, assets.usdc)).wait();
    await (await strategy.setParams(router, pair)).wait();
    console.log('StrategyQsMaiUsdt setting done')
};

module.exports.tags = ['setting','StrategyQsMaiUsdtSetting'];

