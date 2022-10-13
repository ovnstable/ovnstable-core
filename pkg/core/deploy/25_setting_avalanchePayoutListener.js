const {ethers} = require("hardhat");
const {transferETH} = require("@overnight-contracts/common/utils/script-utils");

let {DEFAULT} = require('@overnight-contracts/common/utils/assets');

module.exports = async ({getNamedAccounts, deployments}) => {
    const {deploy} = deployments;
    const {deployer} = await getNamedAccounts();

//    const signers = await ethers.getSigners();
//    const account = signers[0];
//    await transferETH(1, account.address);

    const avalanchePL = await ethers.getContract("AvalanchePayoutListener");
    const usdPlus = await ethers.getContract("UsdPlusToken");
//    const exchange = await ethers.getContract("Exchange");
//
//    await (await avalanchePL.setExchanger(exchange.address)).wait();
//
//    let pools = [
//        // TraderJoe usdPlus pools
//        "0xFA57b9CF0Ce0ac5B66aaD8De9F2c71311f90C33B",  // USD+/USDC
//    ]
//
//    await (await avalanchePL.setQsSyncPools(pools)).wait();

    let swapsicleSkimPools = [
        "0x7B4BFbEed1DEBb17c612a343CE392A9aFa1B3F6A", //WAVAX/USD+
        "0x3e938F737696a0370bF01E8Cc30ed0e845cF78F2", //USDC/USD+
        "0x4464F197317C3b65F63CCfE21D6184E65ca88d52", //POPS/USD+
    ]

    await (await avalanchePL.setSwapsicleSkimPools(swapsicleSkimPools)).wait();

    await (await avalanchePL.setSwapsicleDepositWallet("0x4B78B52E7De4d8B7d367297CB8a87c1875A9d591")).wait();

    await (await avalanchePL.setUsdPlus(usdPlus.address)).wait();

    console.log('AvalanchePayoutListener done');

};

module.exports.tags = [ 'SettingAvalanchePayoutListener'];

