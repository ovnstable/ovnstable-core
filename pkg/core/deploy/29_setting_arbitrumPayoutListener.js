const {ethers} = require("hardhat");
const {COMMON} = require("@overnight-contracts/common/utils/assets");
const {getPrice} = require("@overnight-contracts/common/utils/script-utils");

module.exports = async () => {

    const pl = await ethers.getContract("ArbitrumPayoutListener");
    const exchange = await ethers.getContract("Exchange");
    const usdPlus = await ethers.getContract("UsdPlusToken");

    let price = await getPrice();

    await (await pl.setExchanger(exchange.address, price)).wait();
    await (await pl.setUsdPlus(usdPlus.address, price)).wait();
    await (await pl.setRewardWallet(COMMON.rewardWallet, price)).wait();
    await (await pl.setPayoutTimes(1678233600, 7 * 24 * 60 * 60, 15 * 60, price)).wait();

    let solidLizardPools = [
        '0x219fbc3ed20152a9501dDAA47F2a8C193E32D0C6', // sAMM-USD+/USDC
        '0x97e5f60fA17816011039B908C19Fa4B43DE73731', // sAMM-ETS Gamma/USD+
    ];

    let solidLizardBribes = [
        '0xA094194C4cF342C3E7EA36cC565bB37d16e1aB41', // sAMM-USD+/USDC
        '0xC0e8B4ee2009eE197349366F8816faC33e625CeF', // sAMM-ETS Gamma/USD+
    ];

    await (await pl.setSolidLizardPools(solidLizardPools, solidLizardBribes, price)).wait();

    let sterlingPools = [
        '0xd36A246c848714E52eD810c3f9AE60CCabfccD6B', // sAMM-USD+/USDC
        '0xAc4eeD9Ca04B219935d5C4201167aA9257896443', // sAMM-ETS Gamma/USD+
    ];

    await (await pl.setSterlingPools(sterlingPools, price)).wait();

    await (await pl.setSterlingWallet("0x3Bb9372989c81d56db64e8aaD38401E677b91244", price)).wait();

    console.log('ArbitrumPayoutListener setting done');
};

module.exports.tags = ['SettingArbitrumPayoutListener'];

