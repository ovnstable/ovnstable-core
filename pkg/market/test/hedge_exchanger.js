const {expect} = require("chai");
const {deployments, ethers, getNamedAccounts} = require('hardhat');
const {toUSDC, fromOvn, fromUSDC} = require("@overnight-contracts/common/utils/decimals");
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

    sharedBeforeEach("deploy contracts", async () => {
        await hre.run("compile");

        const [mockDeployer] = provider.getWallets();

        collector = provider.createEmptyWallet();

        await deployments.fixture(['HedgeExchanger', 'MockUsdPlusToken', 'MockHedgeStrategy', 'RebaseToken']);

        strategy = await ethers.getContract('MockHedgeStrategy');
        rebase = await ethers.getContract('RebaseToken')
        usdPlus = await ethers.getContract('MockUsdPlusToken');

        const {deployer} = await getNamedAccounts();
        account = deployer;

        exchange = await ethers.getContract("HedgeExchanger");

        await strategy.setAsset(usdPlus.address);
        await exchange.setTokens(usdPlus.address, rebase.address, POLYGON.usdc);
        await exchange.setStrategy(strategy.address);
        await exchange.setCollector(collector.address);
        await rebase.setExchanger(exchange.address);

        await usdPlus.setExchanger(account);

    });


    describe("Buy: Nav less then expected", function () {

        let sum;

        sharedBeforeEach("buy:revert", async () => {
            sum = toUSDC(100);

            await usdPlus.mint(account, sum);
            await usdPlus.approve(exchange.address, sum);

            await strategy.setNavLessThenExpected(true);

        });

        it("Revert", async function () {
            await expectRevert(exchange.buy(sum), 'nav less than expected');
        });

    })

    describe("Buy 100 USD+", function () {


        sharedBeforeEach("buy", async () => {
            const sum = toUSDC(100);

            await usdPlus.mint(account, sum);
            await usdPlus.approve(exchange.address, sum);

            await exchange.buy(sum);

        });

        it("Balance: rebase", async function () {
            expect(fromUSDC(await rebase.balanceOf(account))).to.eq(99.96)
        });

        it("Balance: usd+", async function () {
            expect(fromUSDC(await usdPlus.balanceOf(account))).to.eq(0)
        });

    });


    describe("Redeem 50 USD+", function () {


        sharedBeforeEach("redeem", async () => {
            const sum = toUSDC(100);
            const sumRedeem = toUSDC(50);

            await usdPlus.mint(account, sum);
            await usdPlus.approve(exchange.address, sum);

            await exchange.buy(sum);
            await exchange.redeem(sumRedeem);

        });

        it("Balance: rebase", async function () {
            expect(fromUSDC(await rebase.balanceOf(account))).to.eq(49.96)
        });

        it("Balance: usd+", async function () {
            expect(fromUSDC(await usdPlus.balanceOf(account))).to.eq(49.98)
        });

    });

    describe("Redeem: Nav less then expected", function () {

        let sum;
        let sumRedeem;

        sharedBeforeEach("redeem:revert", async () => {
            sum = toUSDC(100);
            sumRedeem = toUSDC(50);

            await usdPlus.mint(account, sum);
            await usdPlus.approve(exchange.address, sum);

            await exchange.buy(sum);

        });

        it("Revert", async function () {
            await strategy.setNavLessAfterUnstake(true);
            await expectRevert(exchange.redeem(sumRedeem), 'nav less than expected');
        });

    })


    describe("Payout: Profit", function () {

        let payoutTx;

        sharedBeforeEach("payout", async () => {
            const sum = toUSDC(100);

            await usdPlus.mint(account, sum);
            await usdPlus.approve(exchange.address, sum);

            await exchange.buy(sum);

            await usdPlus.mint(strategy.address, toUSDC(10));

            payoutTx = await exchange.payout();

        });

        it("PayoutEvent", async function () {
            await expect(payoutTx)
                .to.emit(exchange, 'PayoutEvent')
                .withArgs(275068, 976493, 8788439, 0);
        });

        it("Balance: rebase", async function () {
            expect(fromUSDC(await rebase.balanceOf(account))).to.eq(108.748439)
        });

        it("Balance collector: rebase", async function () {
            expect(fromUSDC(await rebase.balanceOf(collector.address))).to.eq(1.251561)
        });


    });

    describe("Payout: Loss", function () {

        let payoutTx;

        sharedBeforeEach("payout", async () => {
            const sum = toUSDC(100);

            await usdPlus.mint(account, sum);
            await usdPlus.approve(exchange.address, sum);

            await exchange.buy(sum);

            await usdPlus.burn(strategy.address, toUSDC(10));

            payoutTx = await exchange.payout();

        });

        it("PayoutEvent", async function () {
            await expect(payoutTx)
                .to.emit(exchange, 'PayoutEvent')
                .withArgs(0, 0, 0, 9960000);
        });

        it("Balance: rebase", async function () {
            expect(fromUSDC(await rebase.balanceOf(account))).to.eq(90)
        });

        it("Balance collector: rebase", async function () {
            expect(fromUSDC(await rebase.balanceOf(collector.address))).to.eq(0)
        });


    });


    describe("Payout: Revert-> nav less than expected", function () {


        sharedBeforeEach("payout", async () => {
            const sum = toUSDC(100);

            await usdPlus.mint(account, sum);
            await usdPlus.approve(exchange.address, sum);

            await exchange.buy(sum);
        });


        it("Revert", async function () {
            await strategy.setNavLessAfterBalance(true);
            await expectRevert(exchange.payout(), 'nav less than expected');
        });


    });

});

