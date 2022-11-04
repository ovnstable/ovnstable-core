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
        '0xDf4bB088B1F02881AD4497b6FA7C1E4F81B61C0a', // sAMM-USD+/WETH/USDC
    ];

    let velodromeBribes = [
        '0xe01a297289f0ae9e745dddc61f139537ab733710', // USD+/USDC
        '0x41a7540ec8cb3afafe16a834abe0863f22016ec0', // USD+/LUSD
        '0x35F4Ea9Fa8a081C8Fad8033cb93877bc621c8Ee0', // sAMM-USD+/WETH/USDC
    ];

    await (await pl.setVelodromePools(velodromePools, velodromeBribes)).wait();

    console.log('OptimismPayoutListener done');

};

module.exports.tags = [ 'SettingOptimismPayoutListener'];

