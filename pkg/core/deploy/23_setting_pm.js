const {ethers} = require("hardhat");

let {DEFAULT, BSC} = require('@overnight-contracts/common/utils/assets');
const hre = require("hardhat");

module.exports = async () => {

    const pm = await ethers.getContract("PortfolioManager");
    const exchange = await ethers.getContract("Exchange");

    let asset;
    if (hre.network.name === 'bsc') {
        asset = BSC.busd;
    } else if (hre.network.name === "bsc_usdc") {
        asset = BSC.usdc;
    } else if (hre.network.name === "bsc_usdt") {
        asset = BSC.usdt;
    } else {
        asset = DEFAULT.usdc;
    }

    await (await pm.setExchanger(exchange.address)).wait();
    console.log("pm.setExchanger done");

    await (await pm.setAsset(asset)).wait();
    console.log("pm.setAsset done");

};

module.exports.tags = ['setting', 'SettingPM'];

