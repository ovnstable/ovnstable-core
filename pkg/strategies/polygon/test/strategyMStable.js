const {deployments, ethers, getNamedAccounts} = require('hardhat');
const hre = require("hardhat");
const {expect} = require("chai");
const {POLYGON} = require('../../../common/utils/assets');
const {fromE18, toUSDC, fromUSDC} = require("../../../common/utils/decimals");
const {logStrategyGasUsage} = require("../../../common/utils/strategyCommon");
const {resetHardhat, greatLess} = require('../../../common/utils/tests');
const ERC20 = require('./abi/IERC20.json');


describe("StrategyMStable. Stake/unstake", function () {

    let account;
    let strategy;
    let usdc;
    let vimUsd;

    before(async () => {
        await hre.run("compile");
        await resetHardhat('polygon');

        await deployments.fixture(['StrategyMStable', 'StrategyMStableSetting', 'test']);

        const {deployer} = await getNamedAccounts();
        account = deployer;

        strategy = await ethers.getContract('StrategyMStable');
        await strategy.setPortfolioManager(account);

        usdc = await ethers.getContractAt(ERC20, POLYGON.usdc);
        vimUsd = await ethers.getContractAt(ERC20, POLYGON.vimUsd);
    });

    it("log gas", async () => {
        await logStrategyGasUsage("StrategyMStable", strategy, usdc, account)
    });

    describe("Stake 100 USDC", function () {

        let balanceUsdc;
        let balanceVimUsd;

        before(async () => {

            let balanceUsdcBefore = await usdc.balanceOf(account);
            let balanceVimUsdBefore = await vimUsd.balanceOf(strategy.address);

            await usdc.transfer(strategy.address, toUSDC(100));
            await strategy.stake(usdc.address, toUSDC(100));

            let balanceUsdcAfter = await usdc.balanceOf(account);
            let balanceVimUsdAfter = await vimUsd.balanceOf(strategy.address);

            balanceUsdc = fromUSDC(balanceUsdcBefore - balanceUsdcAfter);
            balanceVimUsd = fromE18(balanceVimUsdAfter - balanceVimUsdBefore);

            console.log("balanceUsdcBefore: " + fromUSDC(balanceUsdcBefore));
            console.log("balanceUsdcAfter: " + fromUSDC(balanceUsdcAfter));
            console.log("balanceUsdc: " + balanceUsdc);
            console.log("balanceVimUsdBefore: " + fromE18(balanceVimUsdBefore));
            console.log("balanceVimUsdAfter: " + fromE18(balanceVimUsdAfter));
            console.log("balanceVimUsd: " + balanceVimUsd);
        });

        it("Balance USDC should be greater than 99 less than 101", async function () {
            greatLess(balanceUsdc, 100, 1);
        });

        it("Balance vimUsd should be greater than 900 less than 1000", async function () {
            greatLess(balanceVimUsd, 950, 50);
        });

        it("NetAssetValue USDC should be greater than 99 less than 101", async function () {
            greatLess(fromUSDC(await strategy.netAssetValue()), 100, 1);
        });

        it("LiquidationValue USDC should be greater than 99 less than 101", async function () {
            greatLess(fromUSDC(await strategy.liquidationValue()), 100, 1);
        });

        describe("Unstake 50 USDC", function () {

            let balanceUsdc;
            let balanceVimUsd;

            before(async () => {

                let balanceUsdcBefore = await usdc.balanceOf(account);
                let balanceVimUsdBefore = await vimUsd.balanceOf(strategy.address);

                await strategy.unstake(usdc.address, toUSDC(50), account, false);

                let balanceUsdcAfter = await usdc.balanceOf(account);
                let balanceVimUsdAfter = await vimUsd.balanceOf(strategy.address);

                balanceUsdc = fromUSDC(balanceUsdcAfter - balanceUsdcBefore);
                balanceVimUsd = fromE18(balanceVimUsdBefore - balanceVimUsdAfter);

                console.log("balanceUsdcBefore: " + fromUSDC(balanceUsdcBefore));
                console.log("balanceUsdcAfter: " + fromUSDC(balanceUsdcAfter));
                console.log("balanceUsdc: " + balanceUsdc);
                console.log("balanceVimUsdBefore: " + fromE18(balanceVimUsdBefore));
                console.log("balanceVimUsdAfter: " + fromE18(balanceVimUsdAfter));
                console.log("balanceVimUsd: " + balanceVimUsd);
            });

            it("Balance USDC should be greater than 49 less than 51", async function () {
                greatLess(balanceUsdc, 50, 1);
            });

            it("Balance vimUsd should be greater than 450 less than 500", async function () {
                greatLess(balanceVimUsd, 475, 25);
            });

            it("NetAssetValue USDC should be greater than 49 less than 51", async function () {
                greatLess(fromUSDC(await strategy.netAssetValue()), 50, 1);
            });

            it("LiquidationValue USDC should be greater than 49 less than 51", async function () {
                greatLess(fromUSDC(await strategy.liquidationValue()), 50, 1);
            });

            describe("Unstake Full", function () {

                let balanceUSDC;
                let balanceVimUsd;

                before(async () => {

                    let balanceUsdcBefore = await usdc.balanceOf(account);
                    let balanceVimUsdBefore = await vimUsd.balanceOf(strategy.address);

                    await strategy.unstake(usdc.address, 0, account, true);

                    let balanceUsdcAfter = await usdc.balanceOf(account);
                    let balanceVimUsdAfter = await vimUsd.balanceOf(strategy.address);

                    balanceUsdc = fromUSDC(balanceUsdcAfter - balanceUsdcBefore);
                    balanceVimUsd = fromE18(balanceVimUsdBefore - balanceVimUsdAfter);

                    console.log("balanceUsdcBefore: " + fromUSDC(balanceUsdcBefore));
                    console.log("balanceUsdcAfter: " + fromUSDC(balanceUsdcAfter));
                    console.log("balanceUsdc: " + balanceUsdc);
                    console.log("balanceVimUsdBefore: " + fromE18(balanceVimUsdBefore));
                    console.log("balanceVimUsdAfter: " + fromE18(balanceVimUsdAfter));
                    console.log("balanceVimUsd: " + balanceVimUsd);
                });

                it("Balance USDC should be greater than 49 less than 51", async function () {
                    greatLess(balanceUsdc, 50, 1);
                });

                it("Balance vimUsd should be greater than 450 less than 500", async function () {
                    greatLess(balanceVimUsd, 475, 25);
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

describe("StrategyMStable. Claim rewards", function () {

    let account;
    let strategy;
    let usdc;

    before(async () => {
        await hre.run("compile");
        await resetHardhat('polygon');

        await deployments.fixture(['StrategyMStable', 'StrategyMStableSetting', 'test']);

        const {deployer} = await getNamedAccounts();
        account = deployer;

        strategy = await ethers.getContract('StrategyMStable');
        await strategy.setPortfolioManager(account);

        usdc = await ethers.getContractAt(ERC20, POLYGON.usdc);
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
