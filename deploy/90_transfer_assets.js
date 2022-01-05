const {ethers, upgrades} = require("hardhat");
const fs = require("fs");

let ERC20 = require('../vapp/src/contracts/ERC20.json');
let ERC20Metadata = require('../vapp/src/contracts/IERC20Metadata.json');
let Vault = require('../deployments/polygon/VaultOld.json');

module.exports = async ({getNamedAccounts, deployments}) => {
    const {deploy, save} = deployments;
    const {deployer} = await getNamedAccounts();


    await deploy('TransferAssets', {
        from: deployer,
        args: [],
        log: true,
    });


    const vault = await ethers.getContract("Vault");
    const oldVault = await ethers.getContractAt(Vault.abi, Vault.address);
    const contract = await ethers.getContract("TransferAssets");
    const portfolio = await ethers.getContract("Portfolio");

    let tx = await contract.setVaults(oldVault.address, vault.address, portfolio.address);
    await tx.wait();

    let idleUSDC = await ethers.getContractAt(ERC20.abi, '0x1ee6470cd75d5686d0b2b90c0305fa46fb0c89a1');
    let wmatic = await ethers.getContractAt(ERC20.abi, '0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270');
    let amUSDC = await ethers.getContractAt(ERC20.abi, '0x1a13F4Ca1d028320A707D99520AbFefca3998b7F');
    let USDC = await ethers.getContractAt(ERC20.abi, '0x2791bca1f2de4661ed88a30c99a7a9449aa84174');
    let am3CRV = await ethers.getContractAt(ERC20.abi, '0xe7a24ef0c5e95ffb0f6684b813a78f2a3ad7d171');
    let am3CRVGauge = await ethers.getContractAt(ERC20.abi, '0x19793b454d3afc7b454f206ffe95ade26ca6912c');
    let CRV = await ethers.getContractAt(ERC20.abi, '0x172370d5Cd63279eFa6d502DAB29171933a610AF');

    let assets = [idleUSDC, USDC, amUSDC, am3CRV, am3CRVGauge, CRV, wmatic];

    console.log('OLD vault: ' + oldVault.address);
    await showBalances(assets, oldVault.address)
    console.log('NEW vault: ' + vault.address);
    await showBalances(assets, vault.address)


    console.log('Set pm -> ' + contract.address)
    tx = await oldVault.setPortfolioManager(contract.address);
    await tx.wait();
    console.log('Set pm -> finish');


    console.log('Move assets start ')
    tx = await contract.move();
    await tx.wait();
    console.log('Move assets finish ')


    console.log('OLD vault: ' + oldVault.address);
    await showBalances(assets, oldVault.address)
    console.log('NEW vault: ' + vault.address);
    await showBalances(assets, vault.address)


    const m2m = await ethers.getContract("Mark2Market");
    console.log("m2m.setVault: " + vault.address);
    tx = await m2m.setVault(vault.address);
    await tx.wait();
    console.log("m2m.setVault done");

    const pm = await ethers.getContract("PortfolioManager");
    console.log('pm.setVault: ' + vault.address)
    tx = await pm.setVault(vault.address);
    await tx.wait();
    console.log("pm.setVault done");

    const rm = await ethers.getContract("RewardManager");
    console.log("rm.setVault: " + vault.address);
    tx = await rm.setVault(vault.address);
    await tx.wait();
    console.log("rm.setVault done")
};

module.exports.tags = ['TransferAssets'];


async function showBalances(assets, address) {

    for (let i = 0; i < assets.length; i++) {
        let asset = assets[i];

        let meta = await ethers.getContractAt(ERC20Metadata.abi, asset.address);

        let symbol = await meta.symbol();
        console.log(`Balance: ${symbol}: ` + (await asset.balanceOf(address) / 10 ** await meta.decimals()));

    }

}
