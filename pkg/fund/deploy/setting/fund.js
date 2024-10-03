const { ethers } = require("hardhat");
const {getContract, initWallet} = require("@overnight-contracts/common/utils/script-utils");
const { BASE } = require("@overnight-contracts/common/utils/assets");

const hre = require('hardhat');
module.exports = async ({getNamedAccounts, deployments}) => {
    const {deploy} = deployments;
    const {deployer} = await getNamedAccounts();

    const wallet = await initWallet();

    const fund = await getContract("MotivationalFund", "base");
    const exchange = await getContract("FundExchange", "base");
    const roleManager = await getContract("RoleManager", "base");
    const pm = await getContract("FundPortfolioManager", "base");
    const cashStrategy = "0x77187c59DB3Be1de90F5Ac56AA48992DD8f32aAe";

    // setting ex for some contracts
    console.log('fund.setExchanger: ' + exchange.address)
    await (await fund.setExchanger(exchange.address, {gasPrice: 6896396})).wait();
    console.log("fund.setExchanger done");

    console.log('pm.setExchanger: ' + exchange.address)
    await (await pm.setExchanger(exchange.address, {gasPrice: 6896396})).wait();
    console.log("pm.setExchanger done");

    // setting depositor for some contracts
    console.log('fund.setDepositor: ' + wallet.address)
    await (await fund.setDepositor(wallet.address, {gasPrice: 6896396})).wait();
    console.log("fund.setDepositor done");

    console.log('ex.setDepositor: ' + wallet.address)
    await (await exchange.setDepositor(wallet.address)).wait();
    console.log("ex.setDepositor done");

    // setting rm for all contracts 
    console.log(`fund.setRoleManager: ${roleManager.address}`);
    await (await fund.setRoleManager(roleManager.address)).wait();
    console.log('fund.setRoleManager done');

    console.log(`ex.setRoleManager: ${roleManager.address}`);
    await (await exchange.setRoleManager(roleManager.address)).wait();
    console.log('exchange.setRoleManager done');

    console.log(`pm.setRoleManager: ${roleManager.address}`);
    await (await pm.setRoleManager(roleManager.address)).wait();
    console.log('pm.setRoleManager done');

    // setting ex

    console.log(`ex.setTokens: ${fund.address, BASE.usdc}`);
    await (await exchange.setTokens(fund.address, BASE.usdc, {gasPrice: 6896396})).wait();
    console.log('exchange.setTokens done');

    console.log(`ex.setPM: ${pm.address}`);
    await (await exchange.setPortfolioManager(pm.address)).wait();
    console.log('exchange.setPM done');

    console.log(`pm.setAsset: ${BASE.usdc}`);
    await (await pm.setAsset(BASE.usdc)).wait();
    console.log('pm.setAsset done');

    console.log(`pm.setCashStraregy: ${cashStrategy}`);
    await (await pm.setCashStrategy(cashStrategy)).wait();
    console.log('pm.setCashStrategy done');

    console.log("success");
};

module.exports.tags = ['setting','SettingFund'];
