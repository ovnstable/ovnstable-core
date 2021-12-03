const { ethers } = require("hardhat");

module.exports = async ({getNamedAccounts, deployments}) => {
    const {deploy} = deployments;
    const {deployer} = await getNamedAccounts();

    console.log('Deployer: '+ deployer)
    const ovn = await ethers.getContract("OvernightToken");
    const exchange = await ethers.getContract("Exchange");

    let tx = await ovn.setExchanger(exchange.address);
    console.log("ovn.setExchanger done: " + JSON.stringify(tx))

};

module.exports.tags = ['setting','SettingOvn'];
