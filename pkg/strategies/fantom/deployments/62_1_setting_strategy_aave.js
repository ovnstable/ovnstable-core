const { ethers } = require("hardhat");

const fs = require("fs");
let assets = JSON.parse(fs.readFileSync('./fantom_assets.json'));

let aaveProvider = "0xa97684ead0e402dC232d5A977953DF7ECBaB3CDb";

module.exports = async ({getNamedAccounts, deployments}) => {
    const {deploy} = deployments;
    const {deployer} = await getNamedAccounts();

    const strategy = await ethers.getContract("FantomStrategyAave");
    const pm = await ethers.getContract("PortfolioManager");

    await (await strategy.setTokens(assets.usdc, assets.amUsdc)).wait();
    await (await strategy.setParams(aaveProvider)).wait();
    await (await strategy.setPortfolioManager(pm.address)).wait();

    console.log('FantomStrategyAave setting done');
};

module.exports.tags = ['setting', 'FantomStrategyAaveSetting'];
