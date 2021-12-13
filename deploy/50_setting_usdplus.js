const { ethers } = require("hardhat");

module.exports = async ({getNamedAccounts, deployments}) => {
    const {deploy} = deployments;
    const {deployer} = await getNamedAccounts();

    console.log('Deployer: '+ deployer)
    const usdPlus = await ethers.getContract("UsdPlusToken");
    const exchange = await ethers.getContract("Exchange");

    console.log('usdPlus.setExchanger: ' + exchange.address)
    let tx = await usdPlus.setExchanger(exchange.address);
    await tx.wait();
    console.log("usdPlus.setExchanger done")

};

module.exports.tags = ['setting','SettingUsdPlusToken'];
