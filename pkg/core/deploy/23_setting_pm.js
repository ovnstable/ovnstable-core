const {ethers} = require("hardhat");

let {DEFAULT, BSC, OPTIMISM, ARBITRUM} = require('@overnight-contracts/common/utils/assets');
const hre = require("hardhat");

module.exports = async () => {

    const pm = await ethers.getContract("PortfolioManager");
    const exchange = await ethers.getContract("Exchange");
    const m2m = await ethers.getContract("Mark2Market");

    let asset;
    if (hre.network.name === "optimism_dai") {
        asset = OPTIMISM.dai;
    }else if (hre.network.name === "arbitrum_dai") {
        asset = ARBITRUM.dai;
    } else {
        asset = DEFAULT.usdc;
    }

    await (await pm.setMark2Market(m2m.address)).wait();
    console.log("pm.setMark2Market done");

    await (await pm.setExchanger(exchange.address)).wait();
    console.log("pm.setExchanger done");

    await (await pm.setAsset(asset)).wait();
    console.log("pm.setAsset done");

};

module.exports.tags = ['setting', 'SettingPM'];

