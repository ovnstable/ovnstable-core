const {ethers} = require("hardhat");

let {DEFAULT} = require('@overnight-contracts/common/utils/assets');

module.exports = async ({getNamedAccounts, deployments}) => {
    const {deploy} = deployments;
    const {deployer} = await getNamedAccounts();

    const pm = await ethers.getContract("PortfolioManager");
    const exchange = await ethers.getContract("Exchange");

    let asset;
    if (process.env.STAND === 'bsc') {
        asset = DEFAULT.busd;
    } else {
        asset = DEFAULT.usdc;
    }

    await (await pm.setExchanger(exchange.address)).wait();
    await (await pm.setAsset(asset)).wait();
};

module.exports.tags = ['setting', 'SettingPM'];

