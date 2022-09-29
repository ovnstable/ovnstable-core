const {ethers} = require("hardhat");


module.exports = async ({getNamedAccounts, deployments}) => {

    const pl = await ethers.getContract("OptimismPayoutListener");
    const exchange = await ethers.getContract("Exchange");
    const usdPlus = await ethers.getContract("UsdPlusToken");

    await (await pl.setExchanger(exchange.address)).wait();
    await (await pl.setTokens(usdPlus.address)).wait();

    let velodromePools = [
        '0x67124355cce2ad7a8ea283e990612ebe12730175', // USD+/USDC
        '0x8a9Cd3dce710e90177B4332C108E159a15736A0F', // USD+/LUSD
    ];

    let velodromeBribes= [
        '0xfd42e5d79567997552986fc8d96434e8a2ad9fb6', // USD+/USDC
        '0x41a7540ec8cb3afafe16a834abe0863f22016ec0', // USD+/LUSD
    ];
    await (await pl.setVelodromePools(velodromePools, velodromeBribes)).wait();

    console.log('OptimismPayoutListener done');

};

module.exports.tags = [ 'SettingOptimismPayoutListener'];

