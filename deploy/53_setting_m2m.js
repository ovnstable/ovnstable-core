const { ethers } = require("hardhat");

module.exports = async ({getNamedAccounts, deployments}) => {
    const {deploy} = deployments;
    const {deployer} = await getNamedAccounts();

    const m2m = await ethers.getContract("Mark2Market");
    const pm = await ethers.getContract("PortfolioManager");
    await (await m2m.setPortfolioManager(pm.address)).wait();
    console.log("m2m.setPortfolioManager done");
};

module.exports.tags = ['setting','setting-m2m'];
