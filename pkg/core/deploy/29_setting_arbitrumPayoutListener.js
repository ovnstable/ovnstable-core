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

    let sterlingPools = [
        '0xd36A246c848714E52eD810c3f9AE60CCabfccD6B', // sAMM-USD+/USDC
        '0xAc4eeD9Ca04B219935d5C4201167aA9257896443', // sAMM-ETS Gamma/USD+
    ];

    await (await pl.setSterlingPools(sterlingPools)).wait();

    await (await pl.setSterlingWallet("0x3Bb9372989c81d56db64e8aaD38401E677b91244")).wait();

    let arbiswapPools = [
        '0x879Ee181eF3F522898deB0a5d45BC80d0B9107C9', // USD+/USDC
        '0x73a39f2c2BbBF3d18d82658f0cD67DA11970195a', // ETS Gamma/USD+
    ];

    await (await pl.setArbiswapPools(arbiswapPools)).wait();

    await (await pl.setArbiswapWallet("0x2d06724F4A3DD69B8C7458DcbFFCaC0De12068C9")).wait();

    console.log('ArbitrumPayoutListener setting done');
};

module.exports.tags = ['SettingArbitrumPayoutListener'];

