const {ethers} = require("hardhat");

module.exports = async () => {

    const pl = await ethers.getContract("ArbitrumPayoutListener");
    const exchange = await ethers.getContract("Exchange");

    await (await pl.setExchanger(exchange.address)).wait();

    console.log('ArbitrumPayoutListener done');

};

module.exports.tags = [ 'SettingArbitrumPayoutListener'];

