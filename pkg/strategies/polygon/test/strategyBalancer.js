const {deployments, ethers, getNamedAccounts} = require('hardhat');
const hre = require("hardhat");
const {POLYGON} = require('@overnight-contracts/common/utils/assets');
const {fromE18, toUSDC, fromUSDC} = require("@overnight-contracts/common/utils/decimals");
const {logStrategyGasUsage} = require("@overnight-contracts/common/utils/strategyCommon");
const {resetHardhat, greatLess} = require('@overnight-contracts/common/utils/tests');
const ERC20 = require('./abi/IERC20.json');


describe("StrategyBalancer. Stake/unstake", function () {

    let account;
    let strategy;
    let usdc;
    let bpspTUsd;

    before(async () => {
        await hre.run("compile");
        await resetHardhat('polygon');

        await deployments.fixture(['StrategyBalancer', 'StrategyBalancerSetting', 'test']);

        const {deployer} = await getNamedAccounts();
        account = deployer;

        strategy = await ethers.getContract('StrategyBalancer');
        await strategy.setPortfolioManager(account);

        usdc = await ethers.getContractAt(ERC20, POLYGON.usdc);
        bpspTUsd = await ethers.getContractAt(ERC20, POLYGON.bpspTUsd);
    });

    it("log gas", async () => {
        await logStrategyGasUsage("StrategyBalancer", strategy, usdc, account)
    });

    describe("Stake 100 USDC", function () {

        let balanceUsdc;
        let balanceBpspTUsd;

        before(async () => {

            let balanceUsdcBefore = await usdc.balanceOf(account);
            let balanceBpspTUsdBefore = await bpspTUsd.balanceOf(strategy.address);

            await usdc.transfer(strategy.address, toUSDC(100));
            await strategy.stake(usdc.address, toUSDC(100));

            let balanceUsdcAfter = await usdc.balanceOf(account);
            let balanceBpspTUsdAfter = await bpspTUsd.balanceOf(strategy.address);

            balanceUsdc = fromUSDC(balanceUsdcBefore - balanceUsdcAfter);
            balanceBpspTUsd = fromE18(balanceBpspTUsdAfter - balanceBpspTUsdBefore);

            console.log("balanceUsdcBefore: " + fromUSDC(balanceUsdcBefore));
            console.log("balanceUsdcAfter: " + fromUSDC(balanceUsdcAfter));
            console.log("balanceUsdc: " + balanceUsdc);
            console.log("balanceBpspTUsdBefore: " + fromE18(balanceBpspTUsdBefore));
            console.log("balanceBpspTUsdAfter: " + fromE18(balanceBpspTUsdAfter));
            console.log("balanceBpspTUsd: " + balanceBpspTUsd);
        });

        it("Balance USDC should be greater than 99 less than 101", async function () {
            greatLess(balanceUsdc, 100, 1);
        });

        it("Balance bpspTUsd should be greater than 90 less than 100", async function () {
            greatLess(balanceBpspTUsd, 95, 5);
        });

        it("NetAssetValue USDC should be greater than 99 less than 101", async function () {
            greatLess(fromUSDC(await strategy.netAssetValue()), 100, 1);
        });

        it("LiquidationValue USDC should be greater than 99 less than 101", async function () {
            greatLess(fromUSDC(await strategy.liquidationValue()), 100, 1);
        });

        describe("Unstake 50 USDC", function () {

            let balanceUsdc;
            let balanceBpspTUsd;

            before(async () => {

                let balanceUsdcBefore = await usdc.balanceOf(account);
                let balanceBpspTUsdBefore = await bpspTUsd.balanceOf(strategy.address);

                await strategy.unstake(usdc.address, toUSDC(50), account, false);

                let balanceUsdcAfter = await usdc.balanceOf(account);
                let balanceBpspTUsdAfter = await bpspTUsd.balanceOf(strategy.address);

                balanceUsdc = fromUSDC(balanceUsdcAfter - balanceUsdcBefore);
                balanceBpspTUsd = fromE18(balanceBpspTUsdBefore - balanceBpspTUsdAfter);

                console.log("balanceUsdcBefore: " + fromUSDC(balanceUsdcBefore));
                console.log("balanceUsdcAfter: " + fromUSDC(balanceUsdcAfter));
                console.log("balanceUsdc: " + balanceUsdc);
                console.log("balanceBpspTUsdBefore: " + fromE18(balanceBpspTUsdBefore));
                console.log("balanceBpspTUsdAfter: " + fromE18(balanceBpspTUsdAfter));
                console.log("balanceBpspTUsd: " + balanceBpspTUsd);
            });

            it("Balance USDC should be greater than 49 less than 51", async function () {
                greatLess(balanceUsdc, 50, 1);
            });

            it("Balance bpspTUsd should be greater than 45 less than 50", async function () {
                greatLess(balanceBpspTUsd, 47.5, 2.5);
            });

            it("NetAssetValue USDC should be greater than 49 less than 51", async function () {
                greatLess(fromUSDC(await strategy.netAssetValue()), 50, 1);
            });

            it("LiquidationValue USDC should be greater than 49 less than 51", async function () {
                greatLess(fromUSDC(await strategy.liquidationValue()), 50, 1);
            });

            describe("Unstake Full", function () {

                let balanceUSDC;
                let balanceBpspTUsd;

                before(async () => {

                    let balanceUsdcBefore = await usdc.balanceOf(account);
                    let balanceBpspTUsdBefore = await bpspTUsd.balanceOf(strategy.address);

                    await strategy.unstake(usdc.address, 0, account, true);

                    let balanceUsdcAfter = await usdc.balanceOf(account);
                    let balanceBpspTUsdAfter = await bpspTUsd.balanceOf(strategy.address);

                    balanceUsdc = fromUSDC(balanceUsdcAfter - balanceUsdcBefore);
                    balanceBpspTUsd = fromE18(balanceBpspTUsdBefore - balanceBpspTUsdAfter);

                    console.log("balanceUsdcBefore: " + fromUSDC(balanceUsdcBefore));
                    console.log("balanceUsdcAfter: " + fromUSDC(balanceUsdcAfter));
                    console.log("balanceUsdc: " + balanceUsdc);
                    console.log("balanceBpspTUsdBefore: " + fromE18(balanceBpspTUsdBefore));
                    console.log("balanceBpspTUsdAfter: " + fromE18(balanceBpspTUsdAfter));
                    console.log("balanceBpspTUsd: " + balanceBpspTUsd);
                });

                it("Balance USDC should be greater than 49 less than 51", async function () {
                    greatLess(balanceUsdc, 50, 1);
                });

                it("Balance bpspTUsd should be greater than 45 less than 50", async function () {
                    greatLess(balanceBpspTUsd, 47.5, 2.5);
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
