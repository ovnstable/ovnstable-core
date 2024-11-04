const { ethers } = require("hardhat");
const {getContract, initWallet} = require("@overnight-contracts/common/utils/script-utils");
const { BASE } = require("@overnight-contracts/common/utils/assets");

const hre = require('hardhat');
module.exports = async ({getNamedAccounts, deployments}) => {
    const {deploy} = deployments;
    const {deployer} = await getNamedAccounts();

    const wallet = await initWallet();

    
    const swap = await getContract("AeroSwap", "base");
    const cashStrategy = BASE.aerodromeFactory;


    console.log(`pm.setCashStraregy: ${cashStrategy}`);
    await (await swap.setSimulationParams(cashStrategy)).wait();
    console.log('pm.setCashStrategy done');

    console.log("success");
};

module.exports.tags = ['setting','SettingSwap'];
