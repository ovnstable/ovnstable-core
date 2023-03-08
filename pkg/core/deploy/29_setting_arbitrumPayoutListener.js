const {ethers} = require("hardhat");
const {COMMON} = require("@overnight-contracts/common/utils/assets");

module.exports = async () => {

    const pl = await ethers.getContract("ArbitrumPayoutListener");
    const exchange = await ethers.getContract("Exchange");
    const usdPlus = await ethers.getContract("UsdPlusToken");

    await (await pl.setExchanger(exchange.address)).wait();
    await (await pl.setUsdPlus(usdPlus.address)).wait();
    await (await pl.setRewardWallet(COMMON.rewardWallet)).wait();

    let solidLizardPools = [
        '0x219fbc3ed20152a9501dDAA47F2a8C193E32D0C6', // sAMM-USD+/USDC
        '0x97e5f60fA17816011039B908C19Fa4B43DE73731', // sAMM-ETS Gamma/USD+
    ];

    await (await pl.setSolidLizardPools(solidLizardPools)).wait();

    let sterlingPools = [
        '0xd36A246c848714E52eD810c3f9AE60CCabfccD6B', // sAMM-USD+/USDC
        '0xAc4eeD9Ca04B219935d5C4201167aA9257896443', // sAMM-ETS Gamma/USD+
    ];

    await (await pl.setSterlingPools(sterlingPools)).wait();
    await (await pl.setSterlingWallet(COMMON.rewardWallet)).wait();

    console.log('ArbitrumPayoutListener setting done');
};

module.exports.tags = ['SettingArbitrumPayoutListener'];

