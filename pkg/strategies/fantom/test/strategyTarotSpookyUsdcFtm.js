const {deployments, ethers, getNamedAccounts} = require('hardhat');
const hre = require('hardhat');
const {FANTOM} = require('../../../common/utils/assets');
const {fromE6, toUSDC, fromUSDC} = require("../../../common/utils/decimals");
const {logStrategyGasUsage} = require("../../../common/utils/strategyCommon");
const {resetHardhat, greatLess} = require('../../../common/utils/tests');
const ERC20 = require('./abi/IERC20.json');


describe("StrategyTarotSpookyUsdcFtm. Stake/unstake", function () {

    let account;
    let strategy;
    let usdc;
    let bTarotSpooky;

    before(async () => {
        await hre.run("compile");
        await resetHardhat('fantom');

        await deployments.fixture(['StrategyTarotSpookyUsdcFtm', 'StrategyTarotSpookyUsdcFtmSetting', 'test']);

        const {deployer} = await getNamedAccounts();
        account = deployer;

        strategy = await ethers.getContract('StrategyTarotSpookyUsdcFtm');
        await strategy.setPortfolioManager(account);

        usdc = await ethers.getContractAt(ERC20, FANTOM.usdc);
        bTarotSpooky = await ethers.getContractAt(ERC20, FANTOM.bTarotSpooky);
    });

    it("log gas", async () => {
        await logStrategyGasUsage("StrategyTarotSpookyUsdcFtm", strategy, usdc, account)
    });

    describe("Stake 100 USDC", function () {

        let balanceUsdc;
        let balanceBTarotSpooky;

        before(async () => {

            let balanceUsdcBefore = await usdc.balanceOf(account);
            let balanceBTarotSpookyBefore = await bTarotSpooky.balanceOf(strategy.address);

            await usdc.transfer(strategy.address, toUSDC(100));
            await strategy.stake(usdc.address, toUSDC(100));

            let balanceUsdcAfter = await usdc.balanceOf(account);
            let balanceBTarotSpookyAfter = await bTarotSpooky.balanceOf(strategy.address);

            balanceUsdc = fromUSDC(balanceUsdcBefore - balanceUsdcAfter);
            balanceBTarotSpooky = fromE6(balanceBTarotSpookyAfter - balanceBTarotSpookyBefore);

            console.log("balanceUsdcBefore: " + fromUSDC(balanceUsdcBefore));
            console.log("balanceUsdcAfter: " + fromUSDC(balanceUsdcAfter));
            console.log("balanceUsdc: " + balanceUsdc);
            console.log("balanceBTarotSpookyBefore: " + fromE6(balanceBTarotSpookyBefore));
            console.log("balanceBTarotSpookyAfter: " + fromE6(balanceBTarotSpookyAfter));
            console.log("balanceBTarotSpooky: " + balanceBTarotSpooky);
        });

        it("Balance USDC should be greater than 99 less than 101", async function () {
            greatLess(balanceUsdc, 100, 1);
        });

        it("Balance bTarotSpooky should be greater than 80 less than 90", async function () {
            greatLess(balanceBTarotSpooky, 85, 5);
        });

        it("NetAssetValue USDC should be greater than 99 less than 101", async function () {
            greatLess(fromUSDC(await strategy.netAssetValue()), 100, 1);
        });

        it("LiquidationValue USDC should be greater than 99 less than 101", async function () {
            greatLess(fromUSDC(await strategy.liquidationValue()), 100, 1);
        });

        describe("Unstake 50 USDC", function () {

            let balanceUsdc;
            let balanceBTarotSpooky;

            before(async () => {

                let balanceUsdcBefore = await usdc.balanceOf(account);
                let balanceBTarotSpookyBefore = await bTarotSpooky.balanceOf(strategy.address);

                await strategy.unstake(usdc.address, toUSDC(50), account, false);

                let balanceUsdcAfter = await usdc.balanceOf(account);
                let balanceBTarotSpookyAfter = await bTarotSpooky.balanceOf(strategy.address);

                balanceUsdc = fromUSDC(balanceUsdcAfter - balanceUsdcBefore);
                balanceBTarotSpooky = fromE6(balanceBTarotSpookyBefore - balanceBTarotSpookyAfter);

                console.log("balanceUsdcBefore: " + fromUSDC(balanceUsdcBefore));
                console.log("balanceUsdcAfter: " + fromUSDC(balanceUsdcAfter));
                console.log("balanceUsdc: " + balanceUsdc);
                console.log("balanceBTarotSpookyBefore: " + fromE6(balanceBTarotSpookyBefore));
                console.log("balanceBTarotSpookyAfter: " + fromE6(balanceBTarotSpookyAfter));
                console.log("balanceBTarotSpooky: " + balanceBTarotSpooky);
            });

            it("Balance USDC should be greater than 49 less than 51", async function () {
                greatLess(balanceUsdc, 50, 1);
            });

            it("Balance bTarotSpooky should be greater than 40 less than 46", async function () {
                greatLess(balanceBTarotSpooky, 43, 3);
            });

            it("NetAssetValue USDC should be greater than 49 less than 51", async function () {
                greatLess(fromUSDC(await strategy.netAssetValue()), 50, 1);
            });

            it("LiquidationValue USDC should be greater than 49 less than 51", async function () {
                greatLess(fromUSDC(await strategy.liquidationValue()), 50, 1);
            });

            describe("Unstake Full", function () {

                let balanceUSDC;
                let balanceBTarotSpooky;

                before(async () => {

                    let balanceUsdcBefore = await usdc.balanceOf(account);
                    let balanceBTarotSpookyBefore = await bTarotSpooky.balanceOf(strategy.address);

                    await strategy.unstake(usdc.address, 0, account, true);

                    let balanceUsdcAfter = await usdc.balanceOf(account);
                    let balanceBTarotSpookyAfter = await bTarotSpooky.balanceOf(strategy.address);

                    balanceUsdc = fromUSDC(balanceUsdcAfter - balanceUsdcBefore);
                    balanceBTarotSpooky = fromE6(balanceBTarotSpookyBefore - balanceBTarotSpookyAfter);

                    console.log("balanceUsdcBefore: " + fromUSDC(balanceUsdcBefore));
                    console.log("balanceUsdcAfter: " + fromUSDC(balanceUsdcAfter));
                    console.log("balanceUsdc: " + balanceUsdc);
                    console.log("balanceBTarotSpookyBefore: " + fromE6(balanceBTarotSpookyBefore));
                    console.log("balanceBTarotSpookyAfter: " + fromE6(balanceBTarotSpookyAfter));
                    console.log("balanceBTarotSpooky: " + balanceBTarotSpooky);
                });

                it("Balance USDC should be greater than 49 less than 51", async function () {
                    greatLess(balanceUsdc, 50, 1);
                });

                it("Balance bTarotSpooky should be greater than 40 less than 46", async function () {
                    greatLess(balanceBTarotSpooky, 43, 3);
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
