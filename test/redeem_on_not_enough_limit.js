const {expect} = require("chai");
const chai = require("chai");
const {deployments, ethers, getNamedAccounts} = require('hardhat');
const {FakeContract, smock} = require("@defi-wonderland/smock");
const BN = require('bn.js');

const fs = require("fs");
const {toUSDC, fromOvn, toOvn, toE18, fromE18} = require("../utils/decimals");
const hre = require("hardhat");
let assets = JSON.parse(fs.readFileSync('./assets.json'));

chai.use(smock.matchers);


async function showBalances(assets, ownerAddress) {
    for (let i = 0; i < assets.length; i++) {
        let asset = assets[i];
        // let meta = await ethers.getContractAt(ERC20Metadata.abi, asset.address);
        // let symbol = await meta.symbol();
        console.log(`Balance: ${asset.address}: ` + (await asset.balanceOf(ownerAddress) ));
    }
}

describe("Redeem on not enough liquidity", function () {


    let exchange;
    let ovn;
    let usdc;
    let account;
    let pm;
    let m2m;
    let vault;

    before(async () => {
        // need to run inside IDEA via node script running
        await hre.run("compile");

        await deployments.fixture(['Setting','setting','base','Mark2Market', 'PortfolioManager', 'Exchange', 'OvernightToken', 'SettingExchange', 'SettingOvn', 'BuyUsdc']);

        const {deployer} = await getNamedAccounts();
        account = deployer;
        exchange = await ethers.getContract("Exchange");
        ovn = await ethers.getContract("OvernightToken");
        pm = await ethers.getContract("PortfolioManager");
        m2m = await ethers.getContract("Mark2Market");
        vault = await ethers.getContract("Vault");
        usdc = await ethers.getContractAt("ERC20", assets.usdc);

    });

    it("Redeem on liquidity below limit", async function () {

        let idleUSDC = await ethers.getContractAt("ERC20", '0x1ee6470cd75d5686d0b2b90c0305fa46fb0c89a1');
        let USDC = await ethers.getContractAt("ERC20", '0x2791bca1f2de4661ed88a30c99a7a9449aa84174');
        let amUSDC = await ethers.getContractAt("ERC20", '0x1a13F4Ca1d028320A707D99520AbFefca3998b7F');
        let am3CRV = await ethers.getContractAt("ERC20", '0xe7a24ef0c5e95ffb0f6684b813a78f2a3ad7d171');
        let am3CRVGauge = await ethers.getContractAt("ERC20", '0x19793b454d3afc7b454f206ffe95ade26ca6912c');
        let CRV = await ethers.getContractAt("ERC20", '0x172370d5Cd63279eFa6d502DAB29171933a610AF');
        let wmatic = await ethers.getContractAt("ERC20", '0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270');

        let assetsForLog = [idleUSDC, USDC, amUSDC, am3CRV, am3CRVGauge, CRV, wmatic, ovn];

        let totalUsdcPrice = await m2m.totalUsdcPrice();
        console.log("totalUsdcPrice: " + fromE18(totalUsdcPrice));

        console.log("---  " + "User " + account + ":");
        await showBalances(assetsForLog, account);
        console.log("---------------------");

        console.log("---  " + "Vault " + vault.address + ":");
        await showBalances(assetsForLog, vault.address);
        console.log("---------------------");


        const sum = toUSDC(100);
        await usdc.approve(exchange.address, sum);

        console.log("USDC: " + assets.usdc)
        let result = await exchange.buy(assets.usdc, sum);
        console.log("Buy done, wait for result")
        let waitResult = await result.wait();
        console.log("Gas used for buy 1: " + waitResult.gasUsed);

        console.log("---  " + "User " + account + ":");
        await showBalances(assetsForLog, account);
        console.log("---------------------");

        console.log("---  " + "Vault " + vault.address + ":");
        await showBalances(assetsForLog, vault.address);
        console.log("---------------------");

        let crvBalance = fromE18(await am3CRV.balanceOf(account));
        console.log("User balance crv before redeem: " + crvBalance)
        expect(crvBalance).to.equal(0);

        totalUsdcPrice = await m2m.totalUsdcPrice();
        console.log("totalUsdcPrice before mocking: " + fromE18(totalUsdcPrice));

        // set total price
        const m2mMock = await smock.fake("Mark2Market");
        // let d =  toE18(90);
        let mockedTotalUsdcPrice =  new BN(90).mul(new BN(10).pow(new BN(18)));
        console.log("mockedTotalUsdcPrice: " + mockedTotalUsdcPrice);
        m2mMock.totalUsdcPrice.returns(mockedTotalUsdcPrice.toString());
        console.log("mock addr: " + m2mMock.address);
        console.log("mock totalUsdcPrice: " + await m2mMock.totalUsdcPrice());

        await (await exchange.setMark2Market(m2mMock.address)).wait();
        console.log("Setup mock M2M: exchange.setMark2Market done");


        const ovnSumToRedeem = toOvn(90);
        await ovn.approve(exchange.address, ovnSumToRedeem);

        result = await exchange.redeem(assets.usdc, ovnSumToRedeem);
        console.log("Redeem done, wait for result")
        waitResult = await result.wait();
        console.log("Gas used for redeem: " + waitResult.gasUsed);

        console.log("---  " + "User " + account + ":");
        await showBalances(assetsForLog, account);
        console.log("---------------------");

        console.log("---  " + "Vault " + vault.address + ":");
        await showBalances(assetsForLog, vault.address);
        console.log("---------------------");

        crvBalance = fromE18(await am3CRV.balanceOf(account));
        console.log("User balance crv after redeem: " + crvBalance)
        expect(crvBalance).to.greaterThan(0);

    });

});
