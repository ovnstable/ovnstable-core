const {ethers} = require("hardhat");

const hre = require("hardhat");
let {BSC, OPTIMISM, COMMON, ARBITRUM, BASE, LINEA, getAsset} = require('@overnight-contracts/common/utils/assets');
const {initWallet} = require("@overnight-contracts/common/utils/script-utils");

module.exports = async () => {

    let wallet = await initWallet();
    const exchange = await ethers.getContract("Exchange", wallet);
    const usdPlus = await ethers.getContract("UsdPlusToken", wallet);
    const m2m = await ethers.getContract("Mark2Market", wallet);
    const pm = await ethers.getContract("PortfolioManager", wallet);

    let asset;
    if (hre.network.name === "optimism_dai") {
        asset = OPTIMISM.dai;
    } else if (hre.network.name === "arbitrum_dai") {
        asset = ARBITRUM.dai;
    } else if (hre.network.name === "arbitrum_eth") {
        asset = ARBITRUM.weth;
    } else if (hre.network.name === "base_dai") {
        asset = BASE.dai;
    } else if (hre.network.name === "bsc_usdt") {
        asset = BSC.usdt;
    } else if(hre.network.name === "linea_usdt"){
        asset = LINEA.usdt;
    } else {
        asset = getAsset('usdc');
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

    tx = await exchange.setInsurance(COMMON.rewardWallet);
    await tx.wait();
    console.log("exchange.setInsurance done");

};

module.exports.tags = ['setting', 'SettingExchange'];
