const { ethers } = require("hardhat");

module.exports = async ({getNamedAccounts, deployments}) => {
    const {deploy} = deployments;
    const {deployer} = await getNamedAccounts();

    console.log('Deployer: '+ deployer)
    const ovn = await ethers.getContract("OvernightToken");
    const exchange = await ethers.getContract("Exchange");

    console.log('ovn.setExchanger: ' + exchange.address)
    let tx = await ovn.setExchanger(exchange.address);
    await tx.wait();
    console.log("ovn.setExchanger done")

};

module.exports.tags = ['setting','SettingOvn'];
