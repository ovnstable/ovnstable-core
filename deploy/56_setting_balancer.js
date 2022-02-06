const { ethers } = require("hardhat");
const fs = require("fs");

let assets = JSON.parse(fs.readFileSync('./assets.json'));

module.exports = async ({getNamedAccounts, deployments}) => {
    const {deploy} = deployments;
    const {deployer} = await getNamedAccounts();

    const balancer = await ethers.getContract("StrategyBalancer");
    const m2m = await ethers.getContract("Mark2Market");
    const vault = await ethers.getContract("Vault");
    const portfolio = await ethers.getContract("Portfolio");

    // setup balancer
    await (await balancer.setMark2Market(m2m.address)).wait();
    console.log("balancer.setMark2Market done");

    await (await balancer.setPortfolio(portfolio.address)).wait();
    console.log("balancer.setPortfolio done" );

    await (await balancer.setVault(vault.address)).wait();
    console.log("balancer.setVault done" );

    await (await balancer.setTokens(assets.usdc)).wait();
    console.log("balancer.setTokens done" );
};

module.exports.tags = ['setting','Setting'];
