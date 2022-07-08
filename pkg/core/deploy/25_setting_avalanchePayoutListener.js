const {ethers} = require("hardhat");

let {DEFAULT} = require('@overnight-contracts/common/utils/assets');

module.exports = async ({getNamedAccounts, deployments}) => {
    const {deploy} = deployments;
    const {deployer} = await getNamedAccounts();

    const avalanchePL = await ethers.getContract("AvalanchePayoutListener");
    const exchange = await ethers.getContract("Exchange");

    await (await avalanchePL.setExchanger(exchange.address)).wait();

    let pools = [
        // TraderJoe usdPlus pools
        "0xFA57b9CF0Ce0ac5B66aaD8De9F2c71311f90C33B",  // USD+/USDC
    ]

    await (await avalanchePL.setQsSyncPools(pools)).wait();

    console.log('AvalanchePayoutListener done');

};

module.exports.tags = ['setting', 'SettingAvalanchePayoutListener'];

