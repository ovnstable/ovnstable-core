const {deployments, ethers, getNamedAccounts} = require('hardhat');
const hre = require('hardhat');
const {expect} = require("chai");
const {FANTOM} = require('@overnight-contracts/common/utils/assets');
const {toUSDC, fromUSDC} = require("@overnight-contracts/common/utils/decimals");
const {logStrategyGasUsage} = require("@overnight-contracts/common/utils/strategyCommon");
const {resetHardhat, greatLess} = require('@overnight-contracts/common/utils/tests');
const ERC20 = require('./abi/IERC20.json');


describe("StrategyBeethovenxDeiUsdc. Stake/unstake", function () {

    let account;
    let strategy;
    let usdc;

    before(async () => {
        await hre.run("compile");
        await resetHardhat('fantom');

        await deployments.fixture(['StrategyBeethovenxDeiUsdc', 'StrategyBeethovenxDeiUsdcSetting', 'test']);

        const {deployer} = await getNamedAccounts();
        account = deployer;

        strategy = await ethers.getContract('StrategyBeethovenxDeiUsdc');
        await strategy.setPortfolioManager(account);

        usdc = await ethers.getContractAt(ERC20, FANTOM.usdc);
        bptDeiUsdc = await ethers.getContractAt(ERC20, FANTOM.bptDeiUsdc);
    });

    it("log gas", async () => {
        await logStrategyGasUsage("StrategyBeethovenxDeiUsdc", strategy, usdc, account)
    });

    describe("Stake 100 USDC", function () {

        let balanceUsdc;

        before(async () => {

            let balanceUsdcBefore = await usdc.balanceOf(account);

            await usdc.transfer(strategy.address, toUSDC(100));
            let receipt = await (await strategy.stake(usdc.address, toUSDC(100))).wait();
            console.log(`stake gas used: ${receipt.gasUsed}`); // stake gas used: 724760

            let balanceUsdcAfter = await usdc.balanceOf(account);

            balanceUsdc = fromUSDC(balanceUsdcBefore - balanceUsdcAfter);

            console.log("balanceUsdcBefore: " + fromUSDC(balanceUsdcBefore));
            console.log("balanceUsdcAfter: " + fromUSDC(balanceUsdcAfter));
            console.log("balanceUsdc: " + balanceUsdc);
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

            before(async () => {

                let balanceUsdcBefore = await usdc.balanceOf(account);

                let receipt = await (await strategy.unstake(usdc.address, toUSDC(50), account, false)).wait();
                console.log(`unstake gas used: ${receipt.gasUsed}`); // unstake gas used: 711381

                let balanceUsdcAfter = await usdc.balanceOf(account);

                balanceUsdc = fromUSDC(balanceUsdcAfter - balanceUsdcBefore);

                console.log("balanceUsdcBefore: " + fromUSDC(balanceUsdcBefore));
                console.log("balanceUsdcAfter: " + fromUSDC(balanceUsdcAfter));
                console.log("balanceUsdc: " + balanceUsdc);
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

                before(async () => {

                    let balanceUsdcBefore = await usdc.balanceOf(account);

                    let receipt = await (await strategy.unstake(usdc.address, 0, account, true)).wait();
                    console.log(`unstake full gas used: ${receipt.gasUsed}`);

                    let balanceUsdcAfter = await usdc.balanceOf(account);

                    balanceUsdc = fromUSDC(balanceUsdcAfter - balanceUsdcBefore);

                    console.log("balanceUsdcBefore: " + fromUSDC(balanceUsdcBefore));
                    console.log("balanceUsdcAfter: " + fromUSDC(balanceUsdcAfter));
                    console.log("balanceUsdc: " + balanceUsdc);
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

describe("StrategyBeethovenxDeiUsdc. Claim rewards", function () {

    let account;
    let strategy;
    let usdc;

    before(async () => {
        await hre.run("compile");
        await resetHardhat('fantom');

        await deployments.fixture(['StrategyBeethovenxDeiUsdc', 'StrategyBeethovenxDeiUsdcSetting', 'test']);

        const {deployer} = await getNamedAccounts();
        account = deployer;

        strategy = await ethers.getContract('StrategyBeethovenxDeiUsdc');
        await strategy.setPortfolioManager(account);

        usdc = await ethers.getContractAt(ERC20, FANTOM.usdc);
    });

    describe("Stake 100 USDC. Claim rewards", function () {

        let balanceUsdc;

        before(async () => {

            await usdc.transfer(strategy.address, toUSDC(1000));
            await strategy.stake(usdc.address, toUSDC(1000));

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
