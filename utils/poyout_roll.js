const {expect} = require("chai");
const chai = require("chai");
const {deployments, ethers, getNamedAccounts} = require('hardhat');
const {FakeContract, smock} = require("@defi-wonderland/smock");

const fs = require("fs");
const {toUSDC, fromOvn, toOvn} = require("../utils/decimals");
const hre = require("hardhat");
let assets = JSON.parse(fs.readFileSync('./assets.json'));

chai.use(smock.matchers);


async function showBalances(assets, ownerAddress) {
    for (let i = 0; i < assets.length; i++) {
        let asset = assets[i];
        // let meta = await ethers.getContractAt(ERC20Metadata.abi, asset.address);
        // let symbol = await meta.symbol();
        console.log(`Balance: ${asset.address}: ` + (await asset.balanceOf(ownerAddress)));
    }
}

describe("Payout roll", function () {


    let exchange;
    let usdPlus;
    let usdc;
    let account;
    let pm;
    let m2m;
    let vault;

    before(async () => {
        // need to run inside IDEA via node script running
        await hre.run("compile");

        await deployments.fixture(['Setting', 'setting', 'base', 'Mark2Market', 'PortfolioManager', 'Exchange', 'UsdPlusToken', 'SettingExchange', 'SettingUsdPlusToken', 'BuyUsdc']);

        const {deployer} = await getNamedAccounts();
        account = deployer;
        exchange = await ethers.getContract("Exchange");
        usdPlus = await ethers.getContract("UsdPlusToken");
        pm = await ethers.getContract("PortfolioManager");
        m2m = await ethers.getContract("Mark2Market");
        vault = await ethers.getContract("Vault");
        usdc = await ethers.getContractAt("ERC20", assets.usdc);
        // exchange.setAddr(pmMock.address, m2m.address)
    });


    it("Mint OVN and payout", async function () {

        let idleUSDC = await ethers.getContractAt("ERC20", '0x1ee6470cd75d5686d0b2b90c0305fa46fb0c89a1');
        let USDC = await ethers.getContractAt("ERC20", '0x2791bca1f2de4661ed88a30c99a7a9449aa84174');
        let amUSDC = await ethers.getContractAt("ERC20", '0x1a13F4Ca1d028320A707D99520AbFefca3998b7F');
        let am3CRV = await ethers.getContractAt("ERC20", '0xe7a24ef0c5e95ffb0f6684b813a78f2a3ad7d171');
        let am3CRVGauge = await ethers.getContractAt("ERC20", '0x19793b454d3afc7b454f206ffe95ade26ca6912c');
        let CRV = await ethers.getContractAt("ERC20", '0x172370d5Cd63279eFa6d502DAB29171933a610AF');
        let wmatic = await ethers.getContractAt("ERC20", '0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270');

        let assetsForLog = [idleUSDC, USDC, amUSDC, am3CRV, am3CRVGauge, CRV, wmatic, usdPlus];


        console.log("---  " + "User " + account + ":");
        await showBalances(assetsForLog, account);
        console.log("---------------------");

        console.log("---  " + "Vault " + vault.address + ":");
        await showBalances(assetsForLog, vault.address);
        console.log("---------------------");

        console.log("---------------------");
        console.log("usdPlus.getLiquidityIndex: " + await usdPlus.liquidityIndex());
        console.log("---------------------");

        const sum = toUSDC(100);
        await usdc.approve(exchange.address, sum);

        console.log("USDC: " + assets.usdc)
        let result = await exchange.buy(assets.usdc, sum);
        console.log("Buy done, wait for result")
        let waitResult = await result.wait();
        console.log("Gas used for buy 1: " + waitResult.gasUsed);

        console.log("---------------------");
        console.log("usdPlus.getLiquidityIndex: " + await usdPlus.liquidityIndex());
        console.log("---------------------");

        let balance = fromOvn(await usdPlus.balanceOf(account));
        console.log('Balance usdPlus: ' + balance)
        // expect(balance).to.greaterThanOrEqual(99.96);

        console.log("---  " + "User " + account + ":");
        await showBalances(assetsForLog, account);
        console.log("---------------------");

        console.log("---  " + "Vault " + vault.address + ":");
        await showBalances(assetsForLog, vault.address);
        console.log("---------------------");


        await usdc.approve(exchange.address, sum);

        result = await exchange.buy(assets.usdc, sum);
        console.log("Buy done, wait for result")
        waitResult = await result.wait();
        console.log("Gas used for buy 2: " + waitResult.gasUsed);


        console.log("---  " + "User " + account + ":");
        await showBalances(assetsForLog, account);
        console.log("---------------------");

        console.log("---  " + "Vault " + vault.address + ":");
        await showBalances(assetsForLog, vault.address);
        console.log("---------------------");


        balance = fromOvn(await usdPlus.balanceOf(account));
        console.log('Balance usdPlus: ' + balance)
        balance = fromOvn(await usdc.balanceOf(account));
        console.log('Balance usdc: ' + balance)
        // expect(balance).to.greaterThanOrEqual(99.96);

        const ovnSumToRedeem = toOvn(100);
        await usdPlus.approve(exchange.address, ovnSumToRedeem);

        let ovnBalance = fromOvn(await usdPlus.balanceOf(account));
        console.log('Balance usdPlus: ' + ovnBalance)
        // expect(ovnBalance).to.equal(49.36);

        result = await exchange.redeem(assets.usdc, ovnSumToRedeem);
        console.log("Redeem done, wait for result")
        waitResult = await result.wait();
        console.log("Gas used for redeem: " + waitResult.gasUsed);

        balance = fromOvn(await usdPlus.balanceOf(account));
        console.log('Balance usdPlus: ' + balance)
        balance = fromOvn(await usdc.balanceOf(account));
        console.log('Balance usdc: ' + balance)


        console.log("---  " + "User " + account + ":");
        await showBalances(assetsForLog, account);
        console.log("---------------------");

        console.log("---  " + "Vault " + vault.address + ":");
        await showBalances(assetsForLog, vault.address);
        console.log("---------------------");


    });


    it('should increase liquidity index', async function () {

        let value = 100000;
        const sum = toUSDC(value);
        await usdc.approve(exchange.address, sum);


        let result = await exchange.buy(assets.usdc, sum);
        await result.wait();
        console.log('Buy usdPlus: ' + value)


        let balance = fromOvn(await usdPlus.balanceOf(account));
        console.log('Balance usdPlus: ' + balance);
        console.log('Liq index: ' + await usdPlus.liquidityIndex());

        const time = 1 * 24 * 60 * 60; // 1 day
        await ethers.provider.send("evm_increaseTime", [time])
        await ethers.provider.send('evm_mine');

        console.log('Execute payout ...')
        result = await exchange.payout();
        await result.wait();

        balance = fromOvn(await usdPlus.balanceOf(account));
        console.log('Balance usdPlus: ' + balance);
        console.log('Liq index: ' + await usdPlus.liquidityIndex());

        expect(balance).to.be.above(99988);

        await ethers.provider.send("evm_increaseTime", [time])
        await ethers.provider.send('evm_mine');

        result = await exchange.reward();
        await result.wait();

        balance = fromOvn(await usdPlus.balanceOf(account));
        console.log('Balance usdPlus: ' + balance);
        console.log('Liq index: ' + await usdPlus.liquidityIndex());

        expect(balance).to.be.above(100010);

    });


});
