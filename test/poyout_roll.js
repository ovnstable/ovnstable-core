const {expect} = require("chai");
const chai = require("chai");
const {deployments, ethers, getNamedAccounts} = require('hardhat');
const {FakeContract, smock} = require("@defi-wonderland/smock");

const fs = require("fs");
const {toUSDC, fromOvn, toOvn} = require("../utils/decimals");
const hre = require("hardhat");
let assets = JSON.parse(fs.readFileSync('./assets.json'));

chai.use(smock.matchers);

describe("Payout roll", function () {


    let exchange;
    let ovn;
    let usdc;
    let account;
    let pm;
    let m2m;

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
        usdc = await ethers.getContractAt("ERC20", assets.usdc);

        // const pmMock = await smock.fake(pm);
        // exchange.setAddr(pmMock.address, m2m.address)
    });

    it("Mint OVN and payout", async function () {


        const sum = toUSDC(100);
        await usdc.approve(exchange.address, sum);

        console.log("USDC: " + assets.usdc)
        let result = await exchange.buy(assets.usdc, sum);
        let waitResult = await result.wait();
        console.log("Gas used for buy 1: " + waitResult.gasUsed);

        let balance = fromOvn(await ovn.balanceOf(account));
        console.log('Balance ovn: ' + balance)
        // expect(balance).to.greaterThanOrEqual(99.96);

        await usdc.approve(exchange.address, sum);

        console.log("USDC: " + assets.usdc)
        result = await exchange.buy(assets.usdc, sum);
        waitResult = await result.wait();
        console.log("Gas used for buy 2: " + waitResult.gasUsed);

        balance = fromOvn(await ovn.balanceOf(account));
        console.log('Balance ovn: ' + balance)
        balance = fromOvn(await usdc.balanceOf(account));
        console.log('Balance usdc: ' + balance)
        // expect(balance).to.greaterThanOrEqual(99.96);

        const ovnSumToRedeem = toOvn(100);
        await ovn.approve(exchange.address, ovnSumToRedeem);

        let ovnBalance = fromOvn(await ovn.balanceOf(account));
        console.log('Balance ovn: ' + ovnBalance)
        // expect(ovnBalance).to.equal(49.36);

        result = await exchange.redeem(assets.usdc, ovnSumToRedeem);
        waitResult = await result.wait();
        console.log("Gas used for redeem: " + waitResult.gasUsed);

        balance = fromOvn(await ovn.balanceOf(account));
        console.log('Balance ovn: ' + balance)
        balance = fromOvn(await usdc.balanceOf(account));
        console.log('Balance usdc: ' + balance)

    });

});
