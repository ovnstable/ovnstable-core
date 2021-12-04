const { ethers } = require("hardhat");

module.exports = async ({getNamedAccounts, deployments}) => {
    const {deploy} = deployments;
    const {deployer} = await getNamedAccounts();

    const exchange = await ethers.getContract("Exchange");
    const vault = await ethers.getContract("Vault");
    const balancer = await ethers.getContract("Balancer");
    const pm = await ethers.getContract("PortfolioManager");
    const rm = await ethers.getContract("RewardManager");

    // setup pm
    await pm.setVault(vault.address);
    console.log("pm.setVault done");

    await pm.setBalancer(balancer.address);
    console.log("pm.setBalancer done");

    await pm.setExchanger(exchange.address);
    console.log("pm.setExchanger done");

    await pm.setRewardManager(rm.address);
    console.log("pm.setRewardManager done");

};

module.exports.tags = ['setting','Setting'];
