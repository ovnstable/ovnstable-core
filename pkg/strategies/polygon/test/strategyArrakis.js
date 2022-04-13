const {deployments, ethers, getNamedAccounts} = require('hardhat');
const {greatLess} = require('../../../common/utils/tests');
const {fromE18, fromE6, toUSDC, fromUSDC} = require("../../../common/utils/decimals");
const hre = require("hardhat");
const {resetHardhat} = require("../../../common/utils/tests");

let {POLYGON} = require('../../../common/utils/assets');
const {logStrategyGasUsage} = require("../../../common/utils/strategyCommon");
let ERC20 = require('./abi/IERC20.json');


describe("StrategyArrakis. Stake/unstake", function () {

    let account;
    let strategy;
    let usdc;

    before(async () => {
        await hre.run("compile");
        await resetHardhat('polygon');

        await deployments.fixture(['StrategyArrakis', 'StrategyArrakisSetting', 'test']);

        const {deployer} = await getNamedAccounts();
        account = deployer;

        strategy = await ethers.getContract('StrategyArrakis');
        await strategy.setPortfolioManager(account);

        usdc = await ethers.getContractAt(ERC20, POLYGON.usdc);
    });

    it("log gas", async () => {
        await logStrategyGasUsage("StrategyArrakis", strategy, usdc, account)
    });

    describe("Stake 100 USDC", function () {

        let balanceUsdc;

        before(async () => {

            let balanceUsdcBefore = await usdc.balanceOf(account);

            await usdc.transfer(strategy.address, toUSDC(100));
            await strategy.stake(usdc.address, toUSDC(100));

            let balanceUsdcAfter = await usdc.balanceOf(account);
            balanceUsdc = fromUSDC(balanceUsdcBefore - balanceUsdcAfter);
        });

        it("Balance USDC should be greater than 99 less than 101", async function () {
            greatLess(balanceUsdc, 100, 1);
        });

        it("NetAssetValue USDC should be greater than 99 less than 101", async function () {
            greatLess(fromUSDC(await strategy.netAssetValue()), 100, 1);
        });

        it("LiquidationValue USDC should be greater than 99 less than 101", async function () {
            greatLess(fromUSDC(await strategy.liquidationValue()), 100, 1);
        });

        describe("Unstake 50 USDC", function () {

            let balanceUsdc;
            let balanceUsdcLPToken;

            before(async () => {

                let balanceUsdcBefore = await usdc.balanceOf(account);
                let balanceUsdcLPTokenBefore = await dodoMine.getUserLpBalance(usdcLPToken.address, strategy.address);

                await strategy.unstake(usdc.address, toUSDC(50), account, false);

                let balanceUsdcAfter = await usdc.balanceOf(account);
                let balanceUsdcLPTokenAfter = await dodoMine.getUserLpBalance(usdcLPToken.address, strategy.address);

                balanceUsdc = fromUSDC(balanceUsdcAfter - balanceUsdcBefore);
                balanceUsdcLPToken = fromE6(balanceUsdcLPTokenBefore - balanceUsdcLPTokenAfter);

            });

            it("Balance USDC should be greater than 49 less than 51", async function () {
                greatLess(balanceUsdc, 50, 1);
            });

            it("NetAssetValue USDC should be greater than 49 less than 51", async function () {
                greatLess(fromUSDC(await strategy.netAssetValue()), 50, 1);
            });

            it("LiquidationValue USDC should be greater than 49 less than 51", async function () {
                greatLess(fromUSDC(await strategy.liquidationValue()), 50, 1);
            });

            describe("Unstake Full", function () {

                let balanceUSDC;
                let balanceUsdcLPToken;

                before(async () => {

                    let balanceUsdcBefore = await usdc.balanceOf(account);
                    let balanceUsdcLPTokenBefore = await dodoMine.getUserLpBalance(usdcLPToken.address, strategy.address);

                    await strategy.unstake(usdc.address, 0, account, true);

                    let balanceUsdcAfter = await usdc.balanceOf(account);
                    let balanceUsdcLPTokenAfter = await dodoMine.getUserLpBalance(usdcLPToken.address, strategy.address);

                    balanceUsdc = fromUSDC(balanceUsdcAfter - balanceUsdcBefore);
                    balanceUsdcLPToken = fromE6(balanceUsdcLPTokenBefore - balanceUsdcLPTokenAfter);

                    console.log("balanceUsdcBefore: " + fromUSDC(balanceUsdcBefore));
                    console.log("balanceUsdcAfter: " + fromUSDC(balanceUsdcAfter));
                    console.log("balanceUsdc: " + balanceUsdc);
                    console.log("balanceUsdcLPTokenBefore: " + fromE6(balanceUsdcLPTokenBefore));
                    console.log("balanceUsdcLPTokenAfter: " + fromE6(balanceUsdcLPTokenAfter));
                    console.log("balanceUsdcLPToken: " + balanceUsdcLPToken);
                });

                it("Balance USDC should be greater than 49 less than 51", async function () {
                    greatLess(balanceUsdc, 50, 1);
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

describe("StrategyDodoUsdc. Claim rewards", function () {

    let account;
    let strategy;
    let usdc;

    before(async () => {
        await hre.run("compile");
        await resetHardhat('polygon');

        await deployments.fixture(['PortfolioManager', 'StrategyDodoUsdc', 'StrategyDodoUsdcSetting', 'PolygonBuyUsdc']);

        const {deployer} = await getNamedAccounts();
        account = deployer;

        strategy = await ethers.getContract('StrategyDodoUsdc');
        await strategy.setPortfolioManager(account);

        usdc = await ethers.getContractAt("ERC20", assets.usdc);
    });

    describe("Stake 100000 USDC and claim rewards", function () {

        let balanceUsdc;

        before(async () => {

            await usdc.transfer(strategy.address, toUSDC(100000));
            await strategy.stake(usdc.address, toUSDC(100000));

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
