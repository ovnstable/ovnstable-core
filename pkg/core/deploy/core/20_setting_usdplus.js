const { ethers } = require("hardhat");
const {getContract, initWallet} = require("@overnight-contracts/common/utils/script-utils");
const {Wallet} = require("zksync-web3");

const hre = require('hardhat');
module.exports = async ({getNamedAccounts, deployments}) => {
    const {deploy} = deployments;
    const {deployer} = await getNamedAccounts();

    const wallet = await initWallet();

    const usdPlus = await ethers.getContract("UsdPlusToken", wallet);
    const exchange = await ethers.getContract("Exchange", wallet);

    console.log('usdPlus.setExchanger: ' + exchange.address)
    let tx = await usdPlus.setExchanger(exchange.address);
    await tx.wait();
    console.log("usdPlus.setExchanger done");
};

module.exports.tags = ['setting','SettingUsdPlusToken'];
