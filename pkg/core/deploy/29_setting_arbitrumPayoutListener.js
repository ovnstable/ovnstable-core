const {ethers} = require("hardhat");

module.exports = async () => {

    const pl = await ethers.getContract("ArbitrumPayoutListener");
    const exchange = await ethers.getContract("Exchange");
    const usdPlus = await ethers.getContract("UsdPlusToken");

    await (await pl.setExchanger(exchange.address)).wait();
    await (await pl.setUsdPlus(usdPlus.address)).wait();

    let solidLizardPools = [
        '0x219fbc3ed20152a9501dDAA47F2a8C193E32D0C6', // sAMM-USD+/USDC
        '0x97e5f60fA17816011039B908C19Fa4B43DE73731', // sAMM-ETS Gamma/USD+
    ];

    let solidLizardBribes = [
        '0xA094194C4cF342C3E7EA36cC565bB37d16e1aB41', // sAMM-USD+/USDC
        '0xC0e8B4ee2009eE197349366F8816faC33e625CeF', // sAMM-ETS Gamma/USD+
    ];

    await (await pl.setSolidLizardPools(solidLizardPools, solidLizardBribes)).wait();

    console.log('ArbitrumPayoutListener setting done');
};

module.exports.tags = ['SettingArbitrumPayoutListener'];

