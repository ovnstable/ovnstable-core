const {deployments, ethers, getNamedAccounts} = require('hardhat');
const {greatLess} = require('../../../common/utils/tests');
const {fromE18, fromE6, toUSDC, fromUSDC} = require("../../../common/utils/decimals");
const hre = require("hardhat");
const {resetHardhat} = require("../../../common/utils/tests");
const {expect} = require("chai");

let {POLYGON} = require('../../../common/utils/assets');
const {logStrategyGasUsage} = require("../../../common/utils/strategyCommon");
let ERC20 = require('./abi/IERC20.json');


describe("StrategyIzumi. Stake/unstake", function () {

    let account;
    let strategy;
    let usdc;
    let usdt;

    before(async () => {
        await hre.run("compile");
        await resetHardhat('polygon');

        await deployments.fixture(['StrategyIzumi', 'StrategyIzumiSetting', 'test']);

        const {deployer} = await getNamedAccounts();
        account = deployer;

        strategy = await ethers.getContract('StrategyIzumi');
        await strategy.setPortfolioManager(account);

        usdc = await ethers.getContractAt(ERC20, POLYGON.usdc);
        usdt = await ethers.getContractAt(ERC20, POLYGON.usdt);
    });

    it("log gas", async () => {
        await logStrategyGasUsage("StrategyIzumi", strategy, usdc, account)
    });

    it("Token ID (NFT) is 0", async function () {
        expect(await strategy.tokenId()).to.eq(0);
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
            let receipt = await (await strategy.stake(usdc.address, toUSDC(100))).wait();
            console.log(`stake gas used: ${receipt.gasUsed}`);

            await usdc.transfer(strategy.address, toUSDC(100));
            receipt = await (await strategy.stake(usdc.address, toUSDC(100))).wait();
            console.log(`stake gas used: ${receipt.gasUsed}`);
        });

        it("Token ID (NFT) is not 0 ", async function () {
            expect(await strategy.tokenId()).to.not.eq(0);
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
                let receipt = await (await strategy.unstake(usdc.address, toUSDC(50), account, false)).wait();
                console.log(`unstake gas used: ${receipt.gasUsed}`);

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


describe("StrategyIzumi. Claim rewards", function () {

    let account;
    let strategy;
    let usdc;
    let usdt;

    before(async () => {
        await hre.run("compile");
        await resetHardhat('polygon');

        await deployments.fixture(['PortfolioManager', 'StrategyIzumi', 'StrategyIzumiSetting', 'PolygonBuyUsdc']);

        const {deployer} = await getNamedAccounts();
        account = deployer;

        strategy = await ethers.getContract('StrategyIzumi');
        await strategy.setPortfolioManager(account);

        usdc = await ethers.getContractAt("ERC20", POLYGON.usdc);
        usdt = await ethers.getContractAt("ERC20", POLYGON.usdt);
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


describe("StrategyIzumi. Stake/unstakeFull", function () {

    let account;
    let strategy;
    let usdc;
    let usdt;
    let izi;
    let yin;
    let weth;

    before(async () => {
        await hre.run("compile");
        await resetHardhat('polygon');

        await deployments.fixture(['PortfolioManager', 'StrategyIzumi', 'StrategyIzumiSetting', 'PolygonBuyUsdc']);

        const {deployer} = await getNamedAccounts();
        account = deployer;

        strategy = await ethers.getContract('StrategyIzumi');
        await strategy.setPortfolioManager(account);

        usdc = await ethers.getContractAt("ERC20", POLYGON.usdc);
        usdt = await ethers.getContractAt("ERC20", POLYGON.usdt);
        yin = await ethers.getContractAt("ERC20", POLYGON.yin);
        izi = await ethers.getContractAt("ERC20", POLYGON.izi);
        weth = await ethers.getContractAt("ERC20", POLYGON.weth);
    });


    describe("Stake 100 USDC -> unStakeFull", function () {

        let balanceUsdc;

        before(async () => {

            await usdc.transfer(strategy.address, toUSDC(100));
            await strategy.stake(usdc.address, toUSDC(100));

            let balanceUsdcBefore = await usdc.balanceOf(account);
            let receipt = await (await strategy.unstake(usdc.address, 0, account, true)).wait();
            console.log(`unstake gas used: ${receipt.gasUsed}`);

            let balanceUsdcAfter = await usdc.balanceOf(account);
            balanceUsdc = fromUSDC(balanceUsdcAfter - balanceUsdcBefore);

        });

        it("Token ID (NFT) is 0 ", async function () {
            expect(await strategy.tokenId()).to.eq(0);
        });


        it("Balance USDC/USDT/IZI/YIN/WETH should be 0", async function () {
            expect(fromE6(await usdc.balanceOf(strategy.address))).to.eq(0);
            expect(fromE6(await usdt.balanceOf(strategy.address))).to.eq(0);
            expect(fromE18(await izi.balanceOf(strategy.address))).to.eq(0);
            expect(fromE18(await yin.balanceOf(strategy.address))).to.eq(0);
            expect(fromE18(await weth.balanceOf(strategy.address))).to.eq(0);
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
