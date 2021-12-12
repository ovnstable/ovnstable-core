const { ethers } = require("hardhat");

module.exports = async ({getNamedAccounts, deployments}) => {
    const {deploy} = deployments;
    const {deployer} = await getNamedAccounts();

    const exchange = await ethers.getContract("Exchange");
    const vault = await ethers.getContract("Vault");
    const balancer = await ethers.getContract("Balancer");
    const pm = await ethers.getContract("PortfolioManager");
    const rm = await ethers.getContract("RewardManager");
    const portfolio = await ethers.getContract("Portfolio");

    // setup pm

    console.log('pm.setVault: ' + vault.address)
    let tx = await pm.setVault(vault.address);
    await tx.wait();
    console.log("pm.setVault done");

    console.log('pm.setBalancer: ' + balancer.address)
    tx = await pm.setBalancer(balancer.address);
    await tx.wait();
    console.log("pm.setBalancer done");

    console.log('pm.setExchanger: ' + exchange.address)
    tx = await pm.setExchanger(exchange.address);
    await tx.wait();
    console.log("pm.setExchanger done");

    console.log('pm.setRewardManager: ' + rm.address)
    tx = await pm.setRewardManager(rm.address);
    await tx.wait();
    console.log("pm.setRewardManager done");

    console.log('pm.setPortfolio: ' + portfolio.address)
    tx = await pm.setPortfolio(portfolio.address);
    await tx.wait();
    console.log("pm.setPortfolio done");

};

module.exports.tags = ['setting','Setting'];
