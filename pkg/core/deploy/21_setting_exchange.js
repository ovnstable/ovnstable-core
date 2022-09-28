const {ethers} = require("hardhat");

const hre = require("hardhat");
let {DEFAULT, BSC, OPTIMISM} = require('@overnight-contracts/common/utils/assets');

module.exports = async () => {

    const exchange = await ethers.getContract("Exchange");
    const usdPlus = await ethers.getContract("UsdPlusToken");
    const m2m = await ethers.getContract("Mark2Market");
    const pm = await ethers.getContract("PortfolioManager");

    let asset;
    if (hre.network.name === 'bsc') {
        asset = BSC.busd;
    } else if (hre.network.name === "bsc_usdc") {
        asset = BSC.usdc;
    } else if (hre.network.name === "bsc_usdt") {
        asset = BSC.usdt;
    } else if (hre.network.name === "optimism_dai"){
        asset = OPTIMISM.dai;
    }else {
        asset = DEFAULT.usdc;
    }

    console.log("exchange.setToken: usdPlus " + usdPlus.address + " asset: " + asset);
    let tx = await exchange.setTokens(usdPlus.address, asset);
    await tx.wait();
    console.log("exchange.setTokens done");

    // setup exchange
    console.log("exchange.setPortfolioManager: " + pm.address);
    tx = await exchange.setPortfolioManager(pm.address);
    await tx.wait();
    console.log("exchange.setPortfolioManager done");

    console.log("exchange.setMark2Market: " + m2m.address);
    tx = await exchange.setMark2Market(m2m.address);
    await tx.wait();
    console.log("exchange.setMark2Market done");

};

module.exports.tags = ['setting', 'SettingExchange'];
