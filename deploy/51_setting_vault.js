const { ethers } = require("hardhat");

const fs = require('fs');
let assets = JSON.parse(fs.readFileSync('./assets.json'));

let aaveIncentivesController = "0x357D51124f59836DeD84c8a1730D72B749d8BC23"

module.exports = async ({getNamedAccounts, deployments}) => {
    const {deploy} = deployments;
    const {deployer} = await getNamedAccounts();

    const vault = await ethers.getContract("Vault");

    // setup vault
    await (await vault.setPortfolioManager((await ethers.getContract("StrategyIdle")).address)).wait();
    await (await vault.setPortfolioManager((await ethers.getContract("StrategyAave")).address)).wait();
    console.log("vault.setPortfolioManager done");

    await (await vault.setAaveReward(aaveIncentivesController)).wait();
    console.log("vault.setAaveReward done");

    await (await vault.setVimUsdToken(assets.vimUsd)).wait();
    console.log("vault.setVimUsdToken done");
};

module.exports.tags = ['setting','SettingVault'];
