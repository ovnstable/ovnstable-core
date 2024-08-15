const { ethers } = require("hardhat");
const {initWallet} = require("@overnight-contracts/common/utils/script-utils");

module.exports = async ({getNamedAccounts, deployments}) => {
    const {deploy} = deployments;
    const {deployer} = await getNamedAccounts();

    let wallet = await initWallet();

    const m2m = await ethers.getContract("Mark2Market", wallet);
    const pm = await ethers.getContract("PortfolioManager", wallet);
    await (await m2m.setPortfolioManager(pm.address)).wait();
    console.log("m2m.setPortfolioManager done");
};

module.exports.tags = ['setting','SettingM2M'];
