const {deployments, ethers, getNamedAccounts} = require('hardhat');
const hre = require("hardhat");
const {expect} = require("chai");
const {POLYGON} = require('../../../common/utils/assets');
const {fromE6, toUSDC, fromUSDC} = require("../../../common/utils/decimals");
const {logStrategyGasUsage} = require("../../../common/utils/strategyCommon");
const {resetHardhat, greatLess} = require('../../../common/utils/tests');
const ERC20 = require('./abi/IERC20.json');

describe("StrategyDodoUsdt. Stake/unstake", function () {

    let account;
    let strategy;
    let usdc;
    let usdtLPToken;
    let dodoMine;

    before(async () => {
        await hre.run("compile");
        await resetHardhat('polygon');

        await deployments.fixture(['StrategyDodoUsdt', 'StrategyDodoUsdtSetting', 'test']);

        const {deployer} = await getNamedAccounts();
        account = deployer;

        strategy = await ethers.getContract('StrategyDodoUsdt');
        await strategy.setPortfolioManager(account);

        usdc = await ethers.getContractAt(ERC20, POLYGON.usdc);
        usdtLPToken = await ethers.getContractAt(ERC20, "0x2C5CA709d9593F6Fd694D84971c55fB3032B87AB");
        dodoMine = await ethers.getContractAt("IDODOMine", "0xB14dA65459DB957BCEec86a79086036dEa6fc3AD");
    });

    it("log gas", async () => {
        await logStrategyGasUsage("StrategyDodoUsdt", strategy, usdc, account)
    });

    describe("Stake 100 USDC", function () {

        let balanceUsdc;
        let balanceUsdtLPToken;

        before(async () => {

            let balanceUsdcBefore = await usdc.balanceOf(account);
            let balanceUsdtLPTokenBefore = await dodoMine.getUserLpBalance(usdtLPToken.address, strategy.address);

            await usdc.transfer(strategy.address, toUSDC(100));
            await strategy.stake(usdc.address, toUSDC(100));

            let balanceUsdcAfter = await usdc.balanceOf(account);
            let balanceUsdtLPTokenAfter = await dodoMine.getUserLpBalance(usdtLPToken.address, strategy.address);

            balanceUsdc = fromUSDC(balanceUsdcBefore - balanceUsdcAfter);
            balanceUsdtLPToken = fromE6(balanceUsdtLPTokenAfter - balanceUsdtLPTokenBefore);

            console.log("balanceUsdcBefore: " + fromUSDC(balanceUsdcBefore));
            console.log("balanceUsdcAfter: " + fromUSDC(balanceUsdcAfter));
            console.log("balanceUsdc: " + balanceUsdc);
            console.log("balanceUsdtLPTokenBefore: " + fromE6(balanceUsdtLPTokenBefore));
            console.log("balanceUsdtLPTokenAfter: " + fromE6(balanceUsdtLPTokenAfter));
            console.log("balanceUsdtLPToken: " + balanceUsdtLPToken);
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
            let balanceUsdtLPToken;

            before(async () => {

                let balanceUsdcBefore = await usdc.balanceOf(account);
                let balanceUsdtLPTokenBefore = await dodoMine.getUserLpBalance(usdtLPToken.address, strategy.address);

                await strategy.unstake(usdc.address, toUSDC(50), account, false);

                let balanceUsdcAfter = await usdc.balanceOf(account);
                let balanceUsdtLPTokenAfter = await dodoMine.getUserLpBalance(usdtLPToken.address, strategy.address);

                balanceUsdc = fromUSDC(balanceUsdcAfter - balanceUsdcBefore);
                balanceUsdtLPToken = fromE6(balanceUsdtLPTokenBefore - balanceUsdtLPTokenAfter);

                console.log("balanceUsdcBefore: " + fromUSDC(balanceUsdcBefore));
                console.log("balanceUsdcAfter: " + fromUSDC(balanceUsdcAfter));
                console.log("balanceUsdc: " + balanceUsdc);
                console.log("balanceUsdtLPTokenBefore: " + fromE6(balanceUsdtLPTokenBefore));
                console.log("balanceUsdtLPTokenAfter: " + fromE6(balanceUsdtLPTokenAfter));
                console.log("balanceUsdtLPToken: " + balanceUsdtLPToken);
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
                let balanceUsdtLPToken;

                before(async () => {

                    let balanceUsdcBefore = await usdc.balanceOf(account);
                    let balanceUsdtLPTokenBefore = await dodoMine.getUserLpBalance(usdtLPToken.address, strategy.address);

                    await strategy.unstake(usdc.address, 0, account, true);

                    let balanceUsdcAfter = await usdc.balanceOf(account);
                    let balanceUsdtLPTokenAfter = await dodoMine.getUserLpBalance(usdtLPToken.address, strategy.address);

                    balanceUsdc = fromUSDC(balanceUsdcAfter - balanceUsdcBefore);
                    balanceUsdtLPToken = fromE6(balanceUsdtLPTokenBefore - balanceUsdtLPTokenAfter);

                    console.log("balanceUsdcBefore: " + fromUSDC(balanceUsdcBefore));
                    console.log("balanceUsdcAfter: " + fromUSDC(balanceUsdcAfter));
                    console.log("balanceUsdc: " + balanceUsdc);
                    console.log("balanceUsdtLPTokenBefore: " + fromE6(balanceUsdtLPTokenBefore));
                    console.log("balanceUsdtLPTokenAfter: " + fromE6(balanceUsdtLPTokenAfter));
                    console.log("balanceUsdtLPToken: " + balanceUsdtLPToken);
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

describe("StrategyDodoUsdt. Claim rewards", function () {

    let account;
    let strategy;
    let usdc;

    before(async () => {
        await hre.run("compile");
        await resetHardhat('polygon');

        await deployments.fixture(['StrategyDodoUsdt', 'StrategyDodoUsdtSetting', 'test']);

        const {deployer} = await getNamedAccounts();
        account = deployer;

        strategy = await ethers.getContract('StrategyDodoUsdt');
        await strategy.setPortfolioManager(account);

        usdc = await ethers.getContractAt(ERC20, POLYGON.usdc);
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
