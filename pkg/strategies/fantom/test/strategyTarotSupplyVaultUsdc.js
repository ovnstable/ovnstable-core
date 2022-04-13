const {deployments, ethers, getNamedAccounts} = require('hardhat');
const hre = require('hardhat');
const {FANTOM} = require('../../../common/utils/assets');
const {fromE6, toUSDC, fromUSDC} = require("../../../common/utils/decimals");
const {logStrategyGasUsage} = require("../../../common/utils/strategyCommon");
const {resetHardhat, greatLess} = require('../../../common/utils/tests');
const ERC20 = require('./abi/IERC20.json');


describe("StrategyTarotSupplyVaultUsdc. Stake/unstake", function () {

    let account;
    let strategy;
    let usdc;
    let tUsdc;

    before(async () => {
        await hre.run("compile");
        await resetHardhat('fantom');

        await deployments.fixture(['StrategyTarotSupplyVaultUsdc', 'StrategyTarotSupplyVaultUsdcSetting', 'test']);

        const {deployer} = await getNamedAccounts();
        account = deployer;

        strategy = await ethers.getContract('StrategyTarotSupplyVaultUsdc');
        await strategy.setPortfolioManager(account);

        usdc = await ethers.getContractAt(ERC20, FANTOM.usdc);
        tUsdc = await ethers.getContractAt(ERC20, FANTOM.tUsdc);
    });

    it("log gas", async () => {
        await logStrategyGasUsage("StrategyTarotSupplyVaultUsdc", strategy, usdc, account)
    });

    describe("Stake 100 USDC", function () {

        let balanceUsdc;
        let balanceTUsdc;

        before(async () => {

            let balanceUsdcBefore = await usdc.balanceOf(account);
            let balanceTUsdcBefore = await tUsdc.balanceOf(strategy.address);

            await usdc.transfer(strategy.address, toUSDC(100));
            await strategy.stake(usdc.address, toUSDC(100));

            let balanceUsdcAfter = await usdc.balanceOf(account);
            let balanceTUsdcAfter = await tUsdc.balanceOf(strategy.address);

            balanceUsdc = fromUSDC(balanceUsdcBefore - balanceUsdcAfter);
            balanceTUsdc = fromE6(balanceTUsdcAfter - balanceTUsdcBefore);

            console.log("balanceUsdcBefore: " + fromUSDC(balanceUsdcBefore));
            console.log("balanceUsdcAfter: " + fromUSDC(balanceUsdcAfter));
            console.log("balanceUsdc: " + balanceUsdc);
            console.log("balanceTUsdcBefore: " + fromE6(balanceTUsdcBefore));
            console.log("balanceTUsdcAfter: " + fromE6(balanceTUsdcAfter));
            console.log("balanceTUsdc: " + balanceTUsdc);
        });

        it("Balance USDC should be greater than 99 less than 101", async function () {
            greatLess(balanceUsdc, 100, 1);
        });

        it("Balance tUsdc should be greater than 90 less than 100", async function () {
            greatLess(balanceTUsdc, 95, 5);
        });

        it("NetAssetValue USDC should be greater than 99 less than 101", async function () {
            greatLess(fromUSDC(await strategy.netAssetValue()), 100, 1);
        });

        it("LiquidationValue USDC should be greater than 99 less than 101", async function () {
            greatLess(fromUSDC(await strategy.liquidationValue()), 100, 1);
        });

        describe("Unstake 50 USDC", function () {

            let balanceUsdc;
            let balanceTUsdc;

            before(async () => {

                let balanceUsdcBefore = await usdc.balanceOf(account);
                let balanceTUsdcBefore = await tUsdc.balanceOf(strategy.address);

                await strategy.unstake(usdc.address, toUSDC(50), account, false);

                let balanceUsdcAfter = await usdc.balanceOf(account);
                let balanceTUsdcAfter = await tUsdc.balanceOf(strategy.address);

                balanceUsdc = fromUSDC(balanceUsdcAfter - balanceUsdcBefore);
                balanceTUsdc = fromE6(balanceTUsdcBefore - balanceTUsdcAfter);

                console.log("balanceUsdcBefore: " + fromUSDC(balanceUsdcBefore));
                console.log("balanceUsdcAfter: " + fromUSDC(balanceUsdcAfter));
                console.log("balanceUsdc: " + balanceUsdc);
                console.log("balanceTUsdcBefore: " + fromE6(balanceTUsdcBefore));
                console.log("balanceTUsdcAfter: " + fromE6(balanceTUsdcAfter));
                console.log("balanceTUsdc: " + balanceTUsdc);
            });

            it("Balance USDC should be greater than 49 less than 51", async function () {
                greatLess(balanceUsdc, 50, 1);
            });

            it("Balance tUsdc should be greater than 45 less than 51", async function () {
                greatLess(balanceTUsdc, 48, 3);
            });

            it("NetAssetValue USDC should be greater than 49 less than 51", async function () {
                greatLess(fromUSDC(await strategy.netAssetValue()), 50, 1);
            });

            it("LiquidationValue USDC should be greater than 49 less than 51", async function () {
                greatLess(fromUSDC(await strategy.liquidationValue()), 50, 1);
            });

            describe("Unstake Full", function () {

                let balanceUSDC;
                let balanceTUsdc;

                before(async () => {

                    let balanceUsdcBefore = await usdc.balanceOf(account);
                    let balanceTUsdcBefore = await tUsdc.balanceOf(strategy.address);

                    await strategy.unstake(usdc.address, 0, account, true);

                    let balanceUsdcAfter = await usdc.balanceOf(account);
                    let balanceTUsdcAfter = await tUsdc.balanceOf(strategy.address);

                    balanceUsdc = fromUSDC(balanceUsdcAfter - balanceUsdcBefore);
                    balanceTUsdc = fromE6(balanceTUsdcBefore - balanceTUsdcAfter);

                    console.log("balanceUsdcBefore: " + fromUSDC(balanceUsdcBefore));
                    console.log("balanceUsdcAfter: " + fromUSDC(balanceUsdcAfter));
                    console.log("balanceUsdc: " + balanceUsdc);
                    console.log("balanceTUsdcBefore: " + fromE6(balanceTUsdcBefore));
                    console.log("balanceTUsdcAfter: " + fromE6(balanceTUsdcAfter));
                    console.log("balanceTUsdc: " + balanceTUsdc);
                });

                it("Balance USDC should be greater than 49 less than 51", async function () {
                    greatLess(balanceUsdc, 50, 1);
                });

                it("Balance tUsdc should be greater than 45 less than 51", async function () {
                    greatLess(balanceTUsdc, 48, 3);
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
