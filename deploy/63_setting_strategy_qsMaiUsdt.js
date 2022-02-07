const { ethers } = require("hardhat");

const fs = require("fs");
let assets = JSON.parse(fs.readFileSync('./assets.json'));

module.exports = async ({getNamedAccounts, deployments}) => {
    const {deploy} = deployments;
    const {deployer} = await getNamedAccounts();

    const strategy = await ethers.getContract("StrategyQsMaiUsdt");
    // await (await strategy.setParams(aaveAddress, assets.usdc, assets.amUsdc)).wait();
    console.log('StrategyQsMaiUsdt setting done')
};

module.exports.tags = ['setting','StrategyQsMaiUsdtSetting'];

