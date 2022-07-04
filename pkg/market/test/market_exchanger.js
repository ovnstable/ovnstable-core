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

describe("MarketExchanger", function () {

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

        await deployments.fixture(['MarketExchanger', 'MockUsdPlusToken', 'RebaseToken']);

        strategy = await deployMockContract(mockDeployer, await getAbi('IMarketStrategy'));
        rebase = await ethers.getContract('RebaseToken')
        usdPlus = await ethers.getContract('MockUsdPlusToken');

        const {deployer} = await getNamedAccounts();
        account = deployer;

        exchange = await ethers.getContract("MarketExchanger");

        await exchange.setTokens(usdPlus.address, rebase.address);
        await exchange.setMarketStrategy(strategy.address);
        await exchange.setCollector(collector.address);
        await rebase.setExchanger(exchange.address);

    });



    describe("Buy 100 USD+", function () {


        sharedBeforeEach("buy", async () => {
            const sum = toUSDC(100);

            await strategy.mock.stake.returns();

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

            await strategy.mock.stake.returns();
            await strategy.mock.unstake.returns(sumRedeem);

            await usdPlus.mint(account, sum);
            await usdPlus.approve(exchange.address, sum);

            await usdPlus.mint(exchange.address, sumRedeem);

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


    describe("Payout: Profit", function () {

        let payoutTx;

        sharedBeforeEach("payout", async () => {
            const sum = toUSDC(100);

            await strategy.mock.stake.returns();
            await strategy.mock.claimRewards.returns(toUSDC(10));
            await strategy.mock.healthFactorBalance.returns();
            await strategy.mock.netAssetValue.returns(toUSDC(110));

            await usdPlus.mint(account, sum);
            await usdPlus.approve(exchange.address, sum);

            await exchange.buy(sum);


            payoutTx = await exchange.payout();

        });

        it("PayoutEvent", async function () {
            await expect(payoutTx)
                .to.emit(exchange, 'PayoutEvent')
                .withArgs(275, 1003972, 9035753, 0);
        });

        it("Balance: rebase", async function () {
            expect(fromUSDC(await rebase.balanceOf(account))).to.eq(108.995753)
        });

        it("Balance collector: rebase", async function () {
            expect(fromUSDC(await rebase.balanceOf(collector.address))).to.eq(1.004247)
        });


    });

    describe("Payout: Loss", function () {

        let payoutTx;

        sharedBeforeEach("payout", async () => {
            const sum = toUSDC(100);

            await strategy.mock.stake.returns();
            await strategy.mock.claimRewards.returns(toUSDC(10));
            await strategy.mock.healthFactorBalance.returns();
            await strategy.mock.netAssetValue.returns(toUSDC(90));

            await usdPlus.mint(account, sum);
            await usdPlus.approve(exchange.address, sum);

            await exchange.buy(sum);

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



});

