const { ethers } = require("hardhat");

const fs = require('fs');
let assets = JSON.parse(fs.readFileSync('./assets.json'));

let aaveIncentivesController = "0x357D51124f59836DeD84c8a1730D72B749d8BC23"

module.exports = async ({getNamedAccounts, deployments}) => {
    const {deploy} = deployments;
    const {deployer} = await getNamedAccounts();

    const vault = await ethers.getContract("Vault");
    const pm = await ethers.getContract("PortfolioManager");
    const rm = await ethers.getContract("RewardManager");
    const connectorMStable = await ethers.getContract("ConnectorMStable");

    // setup vault
    console.log("vault.setPortfolioManager: " + pm.address);
    let tx = await vault.setPortfolioManager(pm.address);
    await tx.wait();
    console.log("vault.setPortfolioManager done");

    console.log("vault.setRewardManager: " + rm.address);
    tx = await vault.setRewardManager(rm.address);
    await tx.wait();
    console.log("vault.setRewardManager done");

    console.log("vault.setAaveReward: " + aaveIncentivesController);
    tx = await vault.setAaveReward(aaveIncentivesController);
    await tx.wait();
    console.log("vault.setAaveReward done");

    console.log("vault.setConnectorMStable: " + connectorMStable.address);
    tx = await vault.setConnectorMStable(connectorMStable.address);
    await tx.wait();
    console.log("vault.setConnectorMStable done");

    console.log("vault.setVimUsdToken: " + assets.vimUsd);
    tx = await vault.setVimUsdToken(assets.vimUsd);
    await tx.wait();
    console.log("vault.setVimUsdToken done");
};

module.exports.tags = ['setting','SettingVault'];
