const {deployments, ethers, getNamedAccounts} = require('hardhat');
const hre = require("hardhat");
const {expect} = require("chai");
const {POLYGON} = require('../../../common/utils/assets');
const {fromE6, toUSDC, fromUSDC} = require("../../../common/utils/decimals");
const {logStrategyGasUsage} = require("../../../common/utils/strategyCommon");
const {resetHardhat, greatLess} = require('../../../common/utils/tests');
const ERC20 = require('./abi/IERC20.json');


describe("StrategyImpermaxQsUsdt. Stake/unstake", function () {

    let account;
    let strategy;
    let usdc;
    let usdt;

    before(async () => {
        await hre.run("compile");
        await resetHardhat('polygon');

        await deployments.fixture(['StrategyImpermaxQsUsdt', 'StrategyImpermaxQsUsdtSetting', 'test']);

        const {deployer} = await getNamedAccounts();
        account = deployer;

        strategy = await ethers.getContract('StrategyImpermaxQsUsdcUsdt');
        await strategy.setPortfolioManager(account);

        usdc = await ethers.getContractAt(ERC20, POLYGON.usdc);
        usdt = await ethers.getContractAt(ERC20, POLYGON.usdt);
    });

    it("log gas", async () => {
        await logStrategyGasUsage("StrategyImpermaxQsUsdt", strategy, usdc, account)
    });


    it("NetAssetValue is 0", async function () {
        expect(await strategy.netAssetValue()).to.eq(0);
    });

    it("LiquidationValue is 0", async function () {
        expect(await strategy.liquidationValue()).to.eq(0);
    });


    describe("Stake 100+100 USDC", function () {


        before(async () => {

            await usdc.transfer(strategy.address, toUSDC(100));
            await strategy.stake(usdc.address, toUSDC(100));

            await usdc.transfer(strategy.address, toUSDC(100));
            await strategy.stake(usdc.address, toUSDC(100))
        });

        it("NetAssetValue is 200", async function () {
            greatLess(fromUSDC(await strategy.netAssetValue()), 200, 1);
        });

        it("LiquidationValue is 200", async function () {
            greatLess(fromUSDC(await strategy.liquidationValue()), 200, 1);
        });


        describe("Unstake 50 USDC", function () {

            let balanceUsdc;

            before(async () => {

                let balanceUsdcBefore = await usdc.balanceOf(account);
                await strategy.unstake(usdc.address, toUSDC(50), account, false);

                let balanceUsdcAfter = await usdc.balanceOf(account);
                balanceUsdc = fromUSDC(balanceUsdcAfter - balanceUsdcBefore);
            });

            it("Balance USDC should be greater than 49 less than 51", async function () {
                greatLess(balanceUsdc, 50, 1);
            });

            it("Balance USDT should be 0", async function () {
                expect(await usdt.balanceOf(strategy.address)).to.eq(0);
            });

            it("NetAssetValue USDC should be greater than 149 less than 151", async function () {
                greatLess(fromUSDC(await strategy.netAssetValue()), 150, 1);
            });

            it("LiquidationValue USDC should be greater than 149 less than 151", async function () {
                greatLess(fromUSDC(await strategy.liquidationValue()), 150, 1);
            });

        });

    });

});


describe("StrategyImpermaxQsUsdt. Claim rewards", function () {

    let account;
    let strategy;
    let usdc;
    let usdt;

    before(async () => {
        await hre.run("compile");
        await resetHardhat('polygon');

        await deployments.fixture(['StrategyImpermaxQsUsdt', 'StrategyImpermaxQsUsdtSetting', 'test']);

        const {deployer} = await getNamedAccounts();
        account = deployer;

        strategy = await ethers.getContract('StrategyImpermaxQsUsdcUsdt');
        await strategy.setPortfolioManager(account);

        usdc = await ethers.getContractAt(ERC20, POLYGON.usdc);
        usdt = await ethers.getContractAt(ERC20, POLYGON.usdt);
    });

    describe("Stake 100 USDC. Claim rewards", function () {

        let balanceUsdc;

        before(async () => {

            await usdc.transfer(strategy.address, toUSDC(100));
            await strategy.stake(usdc.address, toUSDC(100));

            // timeout 7 days
            const sevenDays = 12 * 24 * 60 * 60;
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


describe("StrategyImpermaxQsUsdt. Stake/unstakeFull", function () {

    let account;
    let strategy;
    let usdc;
    let usdt;
    let imxB;


    before(async () => {
        await hre.run("compile");
        await resetHardhat('polygon');

        await deployments.fixture(['StrategyImpermaxQsUsdt', 'StrategyImpermaxQsUsdtSetting', 'test']);

        const {deployer} = await getNamedAccounts();
        account = deployer;

        strategy = await ethers.getContract('StrategyImpermaxQsUsdcUsdt');
        await strategy.setPortfolioManager(account);

        usdc = await ethers.getContractAt(ERC20, POLYGON.usdc);
        usdt = await ethers.getContractAt(ERC20, POLYGON.usdt);
        imxB = await ethers.getContractAt(ERC20, "0xEaB52C4eFBbB54505EB3FC804A29Dcf263668965");

    });


    describe("Stake 100 USDC -> unStakeFull", function () {

        let balanceUsdc;

        before(async () => {

            await usdc.transfer(strategy.address, toUSDC(100));
            await strategy.stake(usdc.address, toUSDC(100));

            let balanceUsdcBefore = await usdc.balanceOf(account);
            await strategy.unstake(usdc.address, 0, account, true);

            let balanceUsdcAfter = await usdc.balanceOf(account);
            balanceUsdc = fromUSDC(balanceUsdcAfter - balanceUsdcBefore);

        });


        it("Balance USDC/USDT/ImxB should be 0", async function () {
            expect(fromE6(await usdc.balanceOf(strategy.address))).to.eq(0);
            expect(fromE6(await usdt.balanceOf(strategy.address))).to.eq(0);
            expect(fromE6(await imxB.balanceOf(strategy.address))).to.eq(0);
        });

        it("Balance USDC should be greater than 99 less than 101", async function () {
            greatLess(balanceUsdc, 100, 1);
        });

        it("NetAssetValue USDC should be greater than 0 less than 1", async function () {
            greatLess(fromUSDC(await strategy.netAssetValue()), 0.5, 0.5);
        });

        it("LiquidationValue USDC should be greater than 0 less than 1", async function () {
            greatLess(fromUSDC(await strategy.liquidationValue()), 0.5, 0.5);
        });

    });

});
