const { ethers } = require("hardhat");
const {getContract, initWallet} = require("@overnight-contracts/common/utils/script-utils");
const {Wallet} = require("zksync-web3");

const hre = require('hardhat');
module.exports = async ({getNamedAccounts, deployments}) => {
    const {deploy} = deployments;
    const {deployer} = await getNamedAccounts();

    const wallet = await initWallet();

    const token = await ethers.getContract("UsdtPlusToken", wallet);
    const exchange = await ethers.getContract("Exchange", wallet);
    const roleManager = await getContract("RoleManager", 'localhost');
    const payoutManager = await getContract("ZkSyncPayoutManager", 'localhost');  // change for needed payout manager

    console.log('usdPlus.setExchanger: ' + exchange.address)
    await (await token.setExchanger(exchange.address)).wait();
    console.log("usdPlus.setExchanger done");

    console.log(`usdPlus.setPayoutManager: ${payoutManager.address}`);
    await (await token.setPayoutManager(payoutManager.address)).wait();
    console.log('usdPlus.setPayoutManager done');

    console.log(`usdPlus.setRoleManager: ${roleManager.address}`);
    await (await token.setRoleManager(roleManager.address)).wait();
    console.log('usdPlus.setRoleManager done');
};

module.exports.tags = ['setting','SettingToken'];
