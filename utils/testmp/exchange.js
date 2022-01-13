const {expect} = require("chai");
const chai = require("chai");
const {deployments, ethers, getNamedAccounts} = require('hardhat');
const {FakeContract, smock} = require("@defi-wonderland/smock");

const fs = require("fs");
const {toUSDC, fromOvn, toOvn} = require("../utils/decimals");
const hre = require("hardhat");
const expectRevert = require("../utils/expectRevert");
let assets = JSON.parse(fs.readFileSync('./assets.json'));

chai.use(smock.matchers);

describe("Exchange", function () {


    let exchange;
    let usdPlus;
    let usdc;
    let account;
    let pm;
    let m2m;
    let pmMock;

    beforeEach(async () => {
        await hre.run("compile");
        await deployments.fixture(['Mark2Market', 'PortfolioManager', 'Exchange', 'UsdPlusToken', 'SettingExchange', 'SettingUsdPlusToken', 'BuyUsdc']);

        const {deployer} = await getNamedAccounts();
        account = deployer;
        exchange = await ethers.getContract("Exchange");
        usdPlus = await ethers.getContract("UsdPlusToken");
        pm = await ethers.getContract("PortfolioManager");
        m2m = await ethers.getContract("Mark2Market");
        usdc = await ethers.getContractAt("ERC20", assets.usdc);

        pmMock = await smock.fake(pm);
        m2m = await smock.fake(m2m);
        await exchange.setPortfolioManager(pmMock.address);
        await exchange.setMark2Market(m2m.address);

    });

    it("Mint OVN", async function () {

        const sum = toUSDC(100);
        await usdc.approve(exchange.address, sum);

        console.log("USDC: " + assets.usdc)
        await exchange.buy(assets.usdc, sum);

        let balance = fromOvn(await usdPlus.balanceOf(account));
        console.log('Balance usdPlus: ' + balance)
        expect(balance).to.equal(99.96);

    });


    it("Redeem OVN", async function () {

        const sumBuy = toUSDC(100);
        await usdc.approve(exchange.address, sumBuy);

        console.log("USDC: " + assets.usdc)
        await exchange.buy(assets.usdc, sumBuy);

        const sumRedeem = toOvn(50.6);
        await usdPlus.approve(exchange.address, sumRedeem);
        await exchange.redeem(assets.usdc, sumRedeem);

        let balance = fromOvn(await usdPlus.balanceOf(account));
        console.log('Balance usdPlus: ' + balance)
        expect(balance).to.equal(49.36);

    });


    it("Pausable Mint", async function () {
        await exchange.pause();
        await expectRevert(exchange.buy(assets.usdc, toUSDC(100)),
            'Pausable: paused',
        );
    });

    it("Pausable Redeem", async function () {
        await exchange.pause();
        await expectRevert(exchange.redeem(assets.usdc, toUSDC(100)),
            'Pausable: paused',
        );
    });

    it("Pausable Payout", async function () {
        await exchange.pause();
        await expectRevert(exchange.payout(),
            'Pausable: paused',
        );
    });

});
