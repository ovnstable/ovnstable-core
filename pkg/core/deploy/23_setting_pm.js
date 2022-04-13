const {ethers} = require("hardhat");

let {DEFAULT} = require('../../common/utils/assets');

module.exports = async ({getNamedAccounts, deployments}) => {
    const {deploy} = deployments;
    const {deployer} = await getNamedAccounts();

    const pm = await ethers.getContract("PortfolioManager");
    const exchange = await ethers.getContract("Exchange");

    await (await pm.setExchanger(exchange.address)).wait();
    await (await pm.setUsdc(DEFAULT.usdc)).wait();
};

module.exports.tags = ['setting', 'SettingPM'];

