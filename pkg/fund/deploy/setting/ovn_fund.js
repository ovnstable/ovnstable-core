const { ethers } = require("hardhat");
const {getContract, initWallet} = require("@overnight-contracts/common/utils/script-utils");
const {Wallet} = require("zksync-web3");

const hre = require('hardhat');
module.exports = async ({getNamedAccounts, deployments}) => {
    const {deploy} = deployments;
    const {deployer} = await getNamedAccounts();

    const wallet = await initWallet();

    const ovnFund = await ethers.getContract("OvnFund", wallet);
    const exchange = await ethers.getContract("Exchange", wallet);
    const roleManager = await getContract("RoleManager");
    

    console.log('ovnFund.setExchanger: ' + exchange.address)
    await (await ovnFund.setExchanger(exchange.address)).wait();
    console.log("ovnFund.setExchanger done");

    console.log(`ovnFund.setRoleManager: ${roleManager.address}`);
    await (await ovnFund.setRoleManager(roleManager.address)).wait();
    console.log('ovnFund.setRoleManager done');
};

module.exports.tags = ['setting','SettingOvnFund'];
