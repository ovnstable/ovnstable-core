const { ethers } = require("hardhat");

module.exports = async ({getNamedAccounts, deployments}) => {
    const {deploy} = deployments;
    const {deployer} = await getNamedAccounts();

    const vault = await ethers.getContract("Vault");
    const portfolio = await ethers.getContract("Portfolio");
    const m2m = await ethers.getContract("Mark2Market");

    // setup m2m
    await m2m.setVault(vault.address);
    console.log("m2m.setVault done")
    await m2m.setPortfolio(portfolio.address);
    console.log("m2m.setPortfolio done")

};

module.exports.tags = ['setting','Setting'];
