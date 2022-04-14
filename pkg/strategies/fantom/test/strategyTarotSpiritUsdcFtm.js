const {deployments, ethers, getNamedAccounts} = require('hardhat');
const hre = require('hardhat');
const {FANTOM} = require('@overnight-contracts/common/utils/assets');
const {fromE6, toUSDC, fromUSDC} = require("@overnight-contracts/common/utils/decimals");
const {logStrategyGasUsage} = require("@overnight-contracts/common/utils/strategyCommon");
const {resetHardhat, greatLess} = require('@overnight-contracts/common/utils/tests');
const ERC20 = require('./abi/IERC20.json');


describe("StrategyTarotSpiritUsdcFtm. Stake/unstake", function () {

    let account;
    let strategy;
    let usdc;
    let bTarotSpirit;

    before(async () => {
        await hre.run("compile");
        await resetHardhat('fantom');

        await deployments.fixture(['StrategyTarotSpiritUsdcFtm', 'StrategyTarotSpiritUsdcFtmSetting', 'test']);

        const {deployer} = await getNamedAccounts();
        account = deployer;

        strategy = await ethers.getContract('StrategyTarotSpiritUsdcFtm');
        await strategy.setPortfolioManager(account);

        usdc = await ethers.getContractAt(ERC20, FANTOM.usdc);
        bTarotSpirit = await ethers.getContractAt(ERC20, FANTOM.bTarotSpirit);
    });

    it("log gas", async () => {
        await logStrategyGasUsage("StrategyTarotSpiritUsdcFtm", strategy, usdc, account)
    });

    describe("Stake 100 USDC", function () {

        let balanceUsdc;
        let balanceBTarotSpirit;

        before(async () => {

            let balanceUsdcBefore = await usdc.balanceOf(account);
            let balanceBTarotSpiritBefore = await bTarotSpirit.balanceOf(strategy.address);

            await usdc.transfer(strategy.address, toUSDC(100));
            await strategy.stake(usdc.address, toUSDC(100));

            let balanceUsdcAfter = await usdc.balanceOf(account);
            let balanceBTarotSpiritAfter = await bTarotSpirit.balanceOf(strategy.address);

            balanceUsdc = fromUSDC(balanceUsdcBefore - balanceUsdcAfter);
            balanceBTarotSpirit = fromE6(balanceBTarotSpiritAfter - balanceBTarotSpiritBefore);

            console.log("balanceUsdcBefore: " + fromUSDC(balanceUsdcBefore));
            console.log("balanceUsdcAfter: " + fromUSDC(balanceUsdcAfter));
            console.log("balanceUsdc: " + balanceUsdc);
            console.log("balanceBTarotSpiritBefore: " + fromE6(balanceBTarotSpiritBefore));
            console.log("balanceBTarotSpiritAfter: " + fromE6(balanceBTarotSpiritAfter));
            console.log("balanceBTarotSpirit: " + balanceBTarotSpirit);
        });

        it("Balance USDC should be greater than 99 less than 101", async function () {
            greatLess(balanceUsdc, 100, 1);
        });

        it("Balance bTarotSpirit should be greater than 80 less than 90", async function () {
            greatLess(balanceBTarotSpirit, 85, 5);
        });

        it("NetAssetValue USDC should be greater than 99 less than 101", async function () {
            greatLess(fromUSDC(await strategy.netAssetValue()), 100, 1);
        });

        it("LiquidationValue USDC should be greater than 99 less than 101", async function () {
            greatLess(fromUSDC(await strategy.liquidationValue()), 100, 1);
        });

        describe("Unstake 50 USDC", function () {

            let balanceUsdc;
            let balanceBTarotSpirit;

            before(async () => {

                let balanceUsdcBefore = await usdc.balanceOf(account);
                let balanceBTarotSpiritBefore = await bTarotSpirit.balanceOf(strategy.address);

                await strategy.unstake(usdc.address, toUSDC(50), account, false);

                let balanceUsdcAfter = await usdc.balanceOf(account);
                let balanceBTarotSpiritAfter = await bTarotSpirit.balanceOf(strategy.address);

                balanceUsdc = fromUSDC(balanceUsdcAfter - balanceUsdcBefore);
                balanceBTarotSpirit = fromE6(balanceBTarotSpiritBefore - balanceBTarotSpiritAfter);

                console.log("balanceUsdcBefore: " + fromUSDC(balanceUsdcBefore));
                console.log("balanceUsdcAfter: " + fromUSDC(balanceUsdcAfter));
                console.log("balanceUsdc: " + balanceUsdc);
                console.log("balanceBTarotSpiritBefore: " + fromE6(balanceBTarotSpiritBefore));
                console.log("balanceBTarotSpiritAfter: " + fromE6(balanceBTarotSpiritAfter));
                console.log("balanceBTarotSpirit: " + balanceBTarotSpirit);
            });

            it("Balance USDC should be greater than 49 less than 51", async function () {
                greatLess(balanceUsdc, 50, 1);
            });

            it("Balance bTarotSpirit should be greater than 40 less than 46", async function () {
                greatLess(balanceBTarotSpirit, 43, 3);
            });

            it("NetAssetValue USDC should be greater than 49 less than 51", async function () {
                greatLess(fromUSDC(await strategy.netAssetValue()), 50, 1);
            });

            it("LiquidationValue USDC should be greater than 49 less than 51", async function () {
                greatLess(fromUSDC(await strategy.liquidationValue()), 50, 1);
            });

            describe("Unstake Full", function () {

                let balanceUSDC;
                let balanceBTarotSpirit;

                before(async () => {

                    let balanceUsdcBefore = await usdc.balanceOf(account);
                    let balanceBTarotSpiritBefore = await bTarotSpirit.balanceOf(strategy.address);

                    await strategy.unstake(usdc.address, 0, account, true);

                    let balanceUsdcAfter = await usdc.balanceOf(account);
                    let balanceBTarotSpiritAfter = await bTarotSpirit.balanceOf(strategy.address);

                    balanceUsdc = fromUSDC(balanceUsdcAfter - balanceUsdcBefore);
                    balanceBTarotSpirit = fromE6(balanceBTarotSpiritBefore - balanceBTarotSpiritAfter);

                    console.log("balanceUsdcBefore: " + fromUSDC(balanceUsdcBefore));
                    console.log("balanceUsdcAfter: " + fromUSDC(balanceUsdcAfter));
                    console.log("balanceUsdc: " + balanceUsdc);
                    console.log("balanceBTarotSpiritBefore: " + fromE6(balanceBTarotSpiritBefore));
                    console.log("balanceBTarotSpiritAfter: " + fromE6(balanceBTarotSpiritAfter));
                    console.log("balanceBTarotSpirit: " + balanceBTarotSpirit);
                });

                it("Balance USDC should be greater than 49 less than 51", async function () {
                    greatLess(balanceUsdc, 50, 1);
                });

                it("Balance bTarotSpirit should be greater than 40 less than 46", async function () {
                    greatLess(balanceBTarotSpirit, 43, 3);
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
