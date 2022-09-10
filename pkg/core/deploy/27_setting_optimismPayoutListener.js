const {ethers} = require("hardhat");


module.exports = async ({getNamedAccounts, deployments}) => {

    const pl = await ethers.getContract("OptimismPayoutListener");
    const exchange = await ethers.getContract("Exchange");
    const usdPlus = await ethers.getContract("UsdPlusToken");

    await (await pl.setExchanger(exchange.address)).wait();
    await (await pl.setTokens(usdPlus.address)).wait();

    let velodromePools = [
        '0x67124355cce2ad7a8ea283e990612ebe12730175'
    ];

    let velodromeBribes= [
        '0xfd42e5d79567997552986fc8d96434e8a2ad9fb6'
    ];
    await (await pl.setVelodromePools(velodromePools, velodromeBribes)).wait();

    console.log('OptimismPayoutListener done');

};

module.exports.tags = [ 'SettingOptimismPayoutListener'];

