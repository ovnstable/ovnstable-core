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
        '0x2423d642C53939a463F84e14C6a9fFC6fd8f4334', // sAMM-USD+/DAI+
    ];

    await (await pl.setSolidLizardPools(solidLizardPools)).wait();

    let sterlingPools = [
        '0xd36A246c848714E52eD810c3f9AE60CCabfccD6B', // sAMM-USD+/USDC
        '0xAc4eeD9Ca04B219935d5C4201167aA9257896443', // sAMM-ETS Gamma/USD+
        '0x58C1b1d1DD5e27E929ab159f485E9625ca24969C', // sAMM-DAI/DAI+
        '0xB6490141901FE1a16af2ADA782BA897999683757', // sAMM-USD+/DAI+
    ];

    await (await pl.setSterlingPools(sterlingPools)).wait();
    await (await pl.setSterlingWallet(COMMON.rewardWallet)).wait();

    console.log('ArbitrumPayoutListener setting done');
};

module.exports.tags = ['SettingArbitrumPayoutListener'];

