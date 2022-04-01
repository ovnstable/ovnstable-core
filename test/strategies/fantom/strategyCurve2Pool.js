const {expect} = require("chai");
const chai = require("chai");
const {deployments, ethers, getNamedAccounts} = require('hardhat');
const {smock} = require("@defi-wonderland/smock");

const {greatLess, resetHardhat} = require('../../utils/tests');
const fs = require("fs");
const {toUSDC, fromUSDC, fromE18} = require("../../utils/decimals");
const hre = require("hardhat");
const {logStrategyGasUsage} = require("./strategyCommon");
let assets = JSON.parse(fs.readFileSync('./fantom_assets.json'));

chai.use(smock.matchers);


describe("FantomStrategyCurve2Pool. Stake/unstake", function () {

    let account;
    let strategy;
    let usdc;
    let crv2PoolGauge;

    before(async () => {
        await hre.run("compile");
        await resetHardhat('fantom');

        await deployments.fixture(['PortfolioManager', 'FantomStrategyCurve2Pool', 'FantomStrategyCurve2PoolSetting', 'FantomBuyUsdc']);

        const {deployer} = await getNamedAccounts();
        account = deployer;

        strategy = await ethers.getContract('FantomStrategyCurve2Pool');
        await strategy.setPortfolioManager(account);

        usdc = await ethers.getContractAt("ERC20", assets.usdc);
        crv2PoolGauge = await ethers.getContractAt("ERC20", assets.crv2PoolGauge);
    });

    it("log gas", async () => {
        await logStrategyGasUsage("FantomStrategyCurve2Pool", strategy, usdc, account)
    });

    describe("Stake 100 USDC", function () {

        let balanceUsdc;
        let balanceCrv2PoolGauge;

        before(async () => {

            let balanceUsdcBefore = await usdc.balanceOf(account);
            let balanceCrv2PoolGaugeBefore = await crv2PoolGauge.balanceOf(strategy.address);

            await usdc.transfer(strategy.address, toUSDC(100));
            let receipt = await (await strategy.stake(usdc.address, toUSDC(100))).wait();
            console.log(`stake gas used: ${receipt.gasUsed}`); // stake gas used: 724760

            let balanceUsdcAfter = await usdc.balanceOf(account);
            let balanceCrv2PoolGaugeAfter = await crv2PoolGauge.balanceOf(strategy.address);

            balanceUsdc = fromUSDC(balanceUsdcBefore - balanceUsdcAfter);
            balanceCrv2PoolGauge = fromE18(balanceCrv2PoolGaugeAfter - balanceCrv2PoolGaugeBefore);

            console.log("balanceUsdcBefore: " + fromUSDC(balanceUsdcBefore));
            console.log("balanceUsdcAfter: " + fromUSDC(balanceUsdcAfter));
            console.log("balanceUsdc: " + balanceUsdc);
            console.log("balanceCrv2PoolGaugeBefore: " + fromE18(balanceCrv2PoolGaugeBefore));
            console.log("balanceCrv2PoolGaugeAfter: " + fromE18(balanceCrv2PoolGaugeAfter));
            console.log("balanceCrv2PoolGauge: " + balanceCrv2PoolGauge);
        });

        it("Balance USDC should be greater than 99 less than 101", async function () {
            greatLess(balanceUsdc, 100, 1);
        });

        it("Balance crv2PoolGauge should be greater than 90 less than 100", async function () {
            greatLess(balanceCrv2PoolGauge, 95, 5);
        });

        it("NetAssetValue USDC should be greater than 99 less than 101", async function () {
            greatLess(fromUSDC(await strategy.netAssetValue()), 100, 1);
        });

        it("LiquidationValue USDC should be greater than 99 less than 101", async function () {
            greatLess(fromUSDC(await strategy.liquidationValue()), 100, 1);
        });

        describe("Unstake 50 USDC", function () {

            let balanceUsdc;
            let balanceCrv2PoolGauge;

            before(async () => {

                let balanceUsdcBefore = await usdc.balanceOf(account);
                let balanceCrv2PoolGaugeBefore = await crv2PoolGauge.balanceOf(strategy.address);

                let receipt = await (await strategy.unstake(usdc.address, toUSDC(50), account, false)).wait();
                console.log(`unstake gas used: ${receipt.gasUsed}`); // unstake gas used: 711381

                let balanceUsdcAfter = await usdc.balanceOf(account);
                let balanceCrv2PoolGaugeAfter = await crv2PoolGauge.balanceOf(strategy.address);

                balanceUsdc = fromUSDC(balanceUsdcAfter - balanceUsdcBefore);
                balanceCrv2PoolGauge = fromE18(balanceCrv2PoolGaugeBefore - balanceCrv2PoolGaugeAfter);

                console.log("balanceUsdcBefore: " + fromUSDC(balanceUsdcBefore));
                console.log("balanceUsdcAfter: " + fromUSDC(balanceUsdcAfter));
                console.log("balanceUsdc: " + balanceUsdc);
                console.log("balanceCrv2PoolGaugeBefore: " + fromE18(balanceCrv2PoolGaugeBefore));
                console.log("balanceCrv2PoolGaugeAfter: " + fromE18(balanceCrv2PoolGaugeAfter));
                console.log("balanceCrv2PoolGauge: " + balanceCrv2PoolGauge);
            });

            it("Balance USDC should be greater than 49 less than 51", async function () {
                greatLess(balanceUsdc, 50, 1);
            });

            it("Balance crv2PoolGauge should be greater than 45 less than 50", async function () {
                greatLess(balanceCrv2PoolGauge, 47.5, 2.5);
            });

            it("NetAssetValue USDC should be greater than 49 less than 51", async function () {
                greatLess(fromUSDC(await strategy.netAssetValue()), 50, 1);
            });

            it("LiquidationValue USDC should be greater than 49 less than 51", async function () {
                greatLess(fromUSDC(await strategy.liquidationValue()), 50, 1);
            });

            describe("Unstake Full", function () {

                let balanceUSDC;
                let balanceCrv2PoolGauge;

                before(async () => {

                    let balanceUsdcBefore = await usdc.balanceOf(account);
                    let balanceCrv2PoolGaugeBefore = await crv2PoolGauge.balanceOf(strategy.address);

                    let receipt = await (await strategy.unstake(usdc.address, 0, account, true)).wait();
                    console.log(`unstake full gas used: ${receipt.gasUsed}`);

                    let balanceUsdcAfter = await usdc.balanceOf(account);
                    let balanceCrv2PoolGaugeAfter = await crv2PoolGauge.balanceOf(strategy.address);

                    balanceUsdc = fromUSDC(balanceUsdcAfter - balanceUsdcBefore);
                    balanceCrv2PoolGauge = fromE18(balanceCrv2PoolGaugeBefore - balanceCrv2PoolGaugeAfter);

                    console.log("balanceUsdcBefore: " + fromUSDC(balanceUsdcBefore));
                    console.log("balanceUsdcAfter: " + fromUSDC(balanceUsdcAfter));
                    console.log("balanceUsdc: " + balanceUsdc);
                    console.log("balanceCrv2PoolGaugeBefore: " + fromE18(balanceCrv2PoolGaugeBefore));
                    console.log("balanceCrv2PoolGaugeAfter: " + fromE18(balanceCrv2PoolGaugeAfter));
                    console.log("balanceCrv2PoolGauge: " + balanceCrv2PoolGauge);
                });

                it("Balance USDC should be greater than 49 less than 51", async function () {
                    greatLess(balanceUsdc, 50, 1);
                });

                it("Balance crv2PoolGauge should be greater than 45 less than 50", async function () {
                    greatLess(balanceCrv2PoolGauge, 47.5, 2.5);
                });

                it("NetAssetValue USDC should be greater than 0 less than 1", async function () {
                    greatLess(fromUSDC(await strategy.netAssetValue()), 0.5, 0.5);
                });

                it("LiquidationValue USDC should be greater than 0 less than 1", async function () {
                    greatLess(fromUSDC(await strategy.liquidationValue()), 0.5, 0.5);
                });

            });

        });

    });

});

describe("FantomStrategyCurve2Pool. Claim rewards", function () {

    let account;
    let strategy;
    let usdc;

    before(async () => {
        await hre.run("compile");
        await resetHardhat('fantom');

        await deployments.fixture(['PortfolioManager', 'FantomStrategyCurve2Pool', 'FantomStrategyCurve2PoolSetting', 'FantomBuyUsdc']);

        const {deployer} = await getNamedAccounts();
        account = deployer;

        strategy = await ethers.getContract('FantomStrategyCurve2Pool');
        await strategy.setPortfolioManager(account);

        usdc = await ethers.getContractAt("ERC20", assets.usdc);
    });

    describe("Stake 100 USDC. Claim rewards", function () {

        let balanceUsdc;

        before(async () => {

            await usdc.transfer(strategy.address, toUSDC(100));
            await strategy.stake(usdc.address, toUSDC(100));

            // timeout 7 days
            const sevenDays = 7 * 24 * 60 * 60;
            await ethers.provider.send("evm_increaseTime", [sevenDays])
            await ethers.provider.send('evm_mine');

            let balanceUsdcBefore = await usdc.balanceOf(account);
            await strategy.claimRewards(account);
            let balanceUsdcAfter = await usdc.balanceOf(account);

            balanceUsdc = fromUSDC(balanceUsdcAfter - balanceUsdcBefore);
            console.log("Rewards: " + balanceUsdc);
        });

        it("Rewards should be greater or equal 0 USDC", async function () {
            expect(balanceUsdc).to.greaterThanOrEqual(0);
        });

    });

});