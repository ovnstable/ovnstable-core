const {expect} = require("chai");
const {deployments, ethers, getNamedAccounts} = require('hardhat');
const {toE6, fromE6} = require("@overnight-contracts/common/utils/decimals");
const hre = require("hardhat");
const BN = require('bignumber.js');
const {greatLess} = require("@overnight-contracts/common/utils/tests");
const expectRevert = require("@overnight-contracts/common/utils/expectRevert");
const {sharedBeforeEach} = require("@overnight-contracts/common/utils/sharedBeforeEach")
let {POLYGON} = require('@overnight-contracts/common/utils/assets');


const chai = require("chai");
chai.use(require('chai-bignumber')());

const {waffle} = require("hardhat");
const {getAbi} = require("@overnight-contracts/common/utils/script-utils");
const {deployMockContract, provider} = waffle;

describe("HedgeExchanger", function () {

    let account;
    let exchange;
    let strategy;
    let usdPlus;
    let rebase;
    let collector;
    let referral = "CODE";

    sharedBeforeEach("deploy contracts", async () => {
        await hre.run("compile");

        const [mockDeployer] = provider.getWallets();

        collector = provider.createEmptyWallet().address;

        await deployments.fixture(['HedgeExchanger', 'MockUsdPlusToken', 'MockHedgeStrategy', 'RebaseToken']);

        strategy = await ethers.getContract('MockHedgeStrategy');
        rebase = await ethers.getContract('RebaseToken')
        usdPlus = await ethers.getContract('MockUsdPlusToken');

        const {deployer} = await getNamedAccounts();
        account = deployer;

        exchange = await ethers.getContract("HedgeExchanger");

        await strategy.setAsset(usdPlus.address);
        await exchange.setTokens(usdPlus.address, rebase.address);
        await exchange.setStrategy(strategy.address);
        await exchange.setCollector(collector);
        await rebase.setExchanger(exchange.address);

        await usdPlus.setExchanger(account);

        await exchange.setAbroad(0, 100000000);

    });


    describe("Buy: Nav less then expected", function () {

        let sum;

        sharedBeforeEach("buy:revert", async () => {
            sum = toE6(100);

            await usdPlus.mint(account, sum);
            await usdPlus.approve(exchange.address, sum);

            await strategy.setNavLessThenExpected(true);

        });

        it("Revert", async function () {
            await expectRevert(exchange.buy(sum, referral), 'nav less than expected');
        });

    })

    describe("Buy 100 USD+", function () {

        let buyTx;

        sharedBeforeEach("buy", async () => {
            const sum = toE6(100);

            await usdPlus.mint(account, sum);
            await usdPlus.approve(exchange.address, sum);

            buyTx = await exchange.buy(sum, referral);

        });

        it("Balance: rebase", async function () {
            expect(fromE6(await rebase.balanceOf(account))).to.eq(99.96)
        });

        it("Balance: usd+", async function () {
            expect(fromE6(await usdPlus.balanceOf(account))).to.eq(0)
        });

        it("Balance: collector", async function () {
            expect(fromE6(await rebase.balanceOf(collector))).to.eq(0.04)
        });

        it("Event: EventExchange correct", async function () {
            await expect(buyTx)
                .to.emit(exchange, 'EventExchange')
                .withArgs("buy", 99960000, 40000, account, referral);
        });

    });


    describe("Redeem 50 USD+", function () {


        sharedBeforeEach("redeem", async () => {
            const sum = toE6(100);
            const sumRedeem = toE6(50);

            await usdPlus.mint(account, sum);
            await usdPlus.approve(exchange.address, sum);

            await exchange.buy(sum, referral);
            await exchange.redeem(sumRedeem);

        });

        it("Balance: rebase", async function () {
            expect(fromE6(await rebase.balanceOf(account))).to.eq(49.96)
        });

        it("Balance: usd+", async function () {
            expect(fromE6(await usdPlus.balanceOf(account))).to.eq(49.98)
        });

        it("Balance: collector", async function () {
            expect(fromE6(await rebase.balanceOf(collector))).to.eq(0.06)
        });

    });

    describe("Redeem: Nav less then expected", function () {

        let sum;
        let sumRedeem;

        sharedBeforeEach("redeem:revert", async () => {
            sum = toE6(100);
            sumRedeem = toE6(50);

            await usdPlus.mint(account, sum);
            await usdPlus.approve(exchange.address, sum);

            await exchange.buy(sum, referral);

        });

        it("Revert", async function () {
            await strategy.setNavLessAfterUnstake(true);
            await expectRevert(exchange.redeem(sumRedeem), 'nav less than expected');
        });

    })


    describe("Payout: Profit", function () {

        let payoutTx;

        sharedBeforeEach("payout", async () => {
            const sum = toE6(100);

            await usdPlus.mint(account, sum);
            await usdPlus.approve(exchange.address, sum);

            await exchange.buy(sum, referral);

            await usdPlus.mint(strategy.address, toE6(10));

            payoutTx = await exchange.payout();

        });

        it("PayoutEvent", async function () {
            await expect(payoutTx)
                .to.emit(exchange, 'PayoutEvent')
                .withArgs(273972, 972602, 8753426, 0);
        });

        it("Balance: rebase", async function () {
            expect(fromE6(await rebase.balanceOf(account))).to.eq(108.709925)
        });

        it("Balance collector: rebase", async function () {
            expect(fromE6(await rebase.balanceOf(collector))).to.eq(1.290075)
        });


    });

    describe("Payout: Loss", function () {

        let payoutTx;

        sharedBeforeEach("payout", async () => {
            const sum = toE6(100);

            await usdPlus.mint(account, sum);
            await usdPlus.approve(exchange.address, sum);

            await exchange.buy(sum, referral);

            await usdPlus.burn(strategy.address, toE6(10));

            payoutTx = await exchange.payout();

        });

        it("PayoutEvent", async function () {
            await expect(payoutTx)
                .to.emit(exchange, 'PayoutEvent')
                .withArgs(0, 0, 0, 10000000);
        });

        it("Balance: rebase", async function () {
            expect(fromE6(await rebase.balanceOf(account))).to.eq(89.964)
        });

        it("Balance collector: rebase", async function () {
            expect(fromE6(await rebase.balanceOf(collector))).to.eq(0.036)
        });


    });


    describe("Payout: Revert-> nav less than expected", function () {


        sharedBeforeEach("payout", async () => {
            const sum = toE6(100);

            await usdPlus.mint(account, sum);
            await usdPlus.approve(exchange.address, sum);

            await exchange.buy(sum, referral);
        });


        it("Revert", async function () {
            await strategy.setNavLessAfterBalance(true);
            await expectRevert(exchange.payout(), 'nav less than expected');
        });


    });

});

