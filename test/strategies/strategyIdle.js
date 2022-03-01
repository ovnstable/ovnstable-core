const {expect} = require("chai");
const chai = require("chai");
const {deployments, ethers, getNamedAccounts} = require('hardhat');
const {smock} = require("@defi-wonderland/smock");

const {greatLess, resetHardhat} = require('../../utils/tests');
const fs = require("fs");
const {toUSDC, fromUSDC, fromE18} = require("../../utils/decimals");
const hre = require("hardhat");
const {logStrategyGasUsage} = require("./strategyCommon");
let assets = JSON.parse(fs.readFileSync('./assets.json'));

chai.use(smock.matchers);


describe("StrategyIdle. Stake/unstake", function () {

    let account;
    let strategy;
    let usdc;
    let idleUsdc;

    before(async () => {
        await hre.run("compile");
        await resetHardhat();

        await deployments.fixture(['PortfolioManager', 'StrategyIdle', 'StrategyIdleSetting', 'BuyUsdc']);

        const {deployer} = await getNamedAccounts();
        account = deployer;

        strategy = await ethers.getContract('StrategyIdle');
        await strategy.setPortfolioManager(account);

        usdc = await ethers.getContractAt("ERC20", assets.usdc);
        idleUsdc = await ethers.getContractAt("ERC20", assets.idleUsdc);
    });

    it("log gas", async () => {
        await logStrategyGasUsage("StrategyIdle", strategy, usdc, account)
    });

    describe("Stake 100 USDC", function () {

        let balanceUsdc;
        let balanceIdleUsdc;

        before(async () => {

            let balanceUsdcBefore = await usdc.balanceOf(account);
            let balanceIdleUsdcBefore = await idleUsdc.balanceOf(strategy.address);

            await usdc.transfer(strategy.address, toUSDC(100));
            await strategy.stake(usdc.address, toUSDC(100));

            let balanceUsdcAfter = await usdc.balanceOf(account);
            let balanceIdleUsdcAfter = await idleUsdc.balanceOf(strategy.address);

            balanceUsdc = fromUSDC(balanceUsdcBefore - balanceUsdcAfter);
            balanceIdleUsdc = fromE18(balanceIdleUsdcAfter - balanceIdleUsdcBefore);

            console.log("balanceUsdcBefore: " + fromUSDC(balanceUsdcBefore));
            console.log("balanceUsdcAfter: " + fromUSDC(balanceUsdcAfter));
            console.log("balanceUsdc: " + balanceUsdc);
            console.log("balanceIdleUsdcBefore: " + fromE18(balanceIdleUsdcBefore));
            console.log("balanceIdleUsdcAfter: " + fromE18(balanceIdleUsdcAfter));
            console.log("balanceIdleUsdc: " + balanceIdleUsdc);
        });

        it("Balance USDC should be greater than 99 less than 101", async function () {
            greatLess(balanceUsdc, 100, 1);
        });

        it("Balance idleUsdc should be greater than 90 less than 100", async function () {
            greatLess(balanceIdleUsdc, 95, 5);
        });

        it("NetAssetValue USDC should be greater than 99 less than 101", async function () {
            greatLess(fromUSDC(await strategy.netAssetValue()), 100, 1);
        });

        it("LiquidationValue USDC should be greater than 99 less than 101", async function () {
            greatLess(fromUSDC(await strategy.liquidationValue()), 100, 1);
        });

        describe("Unstake 50 USDC", function () {

            let balanceUsdc;
            let balanceIdleUsdc;

            before(async () => {

                let balanceUsdcBefore = await usdc.balanceOf(account);
                let balanceIdleUsdcBefore = await idleUsdc.balanceOf(strategy.address);

                await strategy.unstake(usdc.address, toUSDC(50), account, false);

                let balanceUsdcAfter = await usdc.balanceOf(account);
                let balanceIdleUsdcAfter = await idleUsdc.balanceOf(strategy.address);

                balanceUsdc = fromUSDC(balanceUsdcAfter - balanceUsdcBefore);
                balanceIdleUsdc = fromE18(balanceIdleUsdcBefore - balanceIdleUsdcAfter);

                console.log("balanceUsdcBefore: " + fromUSDC(balanceUsdcBefore));
                console.log("balanceUsdcAfter: " + fromUSDC(balanceUsdcAfter));
                console.log("balanceUsdc: " + balanceUsdc);
                console.log("balanceIdleUsdcBefore: " + fromE18(balanceIdleUsdcBefore));
                console.log("balanceIdleUsdcAfter: " + fromE18(balanceIdleUsdcAfter));
                console.log("balanceIdleUsdc: " + balanceIdleUsdc);
            });

            it("Balance USDC should be greater than 49 less than 51", async function () {
                greatLess(balanceUsdc, 50, 1);
            });

            it("Balance idleUsdc should be greater than 45 less than 50", async function () {
                greatLess(balanceIdleUsdc, 47.5, 2.5);
            });

            it("NetAssetValue USDC should be greater than 49 less than 51", async function () {
                greatLess(fromUSDC(await strategy.netAssetValue()), 50, 1);
            });

            it("LiquidationValue USDC should be greater than 49 less than 51", async function () {
                greatLess(fromUSDC(await strategy.liquidationValue()), 50, 1);
            });

            describe("Unstake Full", function () {

                let balanceUSDC;
                let balanceIdleUsdc;

                before(async () => {

                    let balanceUsdcBefore = await usdc.balanceOf(account);
                    let balanceIdleUsdcBefore = await idleUsdc.balanceOf(strategy.address);

                    await strategy.unstake(usdc.address, 0, account, true);

                    let balanceUsdcAfter = await usdc.balanceOf(account);
                    let balanceIdleUsdcAfter = await idleUsdc.balanceOf(strategy.address);

                    balanceUsdc = fromUSDC(balanceUsdcAfter - balanceUsdcBefore);
                    balanceIdleUsdc = fromE18(balanceIdleUsdcBefore - balanceIdleUsdcAfter);

                    console.log("balanceUsdcBefore: " + fromUSDC(balanceUsdcBefore));
                    console.log("balanceUsdcAfter: " + fromUSDC(balanceUsdcAfter));
                    console.log("balanceUsdc: " + balanceUsdc);
                    console.log("balanceIdleUsdcBefore: " + fromE18(balanceIdleUsdcBefore));
                    console.log("balanceIdleUsdcAfter: " + fromE18(balanceIdleUsdcAfter));
                    console.log("balanceIdleUsdc: " + balanceIdleUsdc);
                });

                it("Balance USDC should be greater than 49 less than 51", async function () {
                    greatLess(balanceUsdc, 50, 1);
                });

                it("Balance idleUsdc should be greater than 45 less than 50", async function () {
                    greatLess(balanceIdleUsdc, 47.5, 2.5);
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
