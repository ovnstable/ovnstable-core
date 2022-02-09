const {expect} = require("chai");
const chai = require("chai");
const {deployments, ethers, getNamedAccounts} = require('hardhat');
const {smock} = require("@defi-wonderland/smock");

const {greatLess} = require('../../utils/tests');
const fs = require("fs");
const {toUSDC, fromUSDC, fromE18} = require("../../utils/decimals");
const hre = require("hardhat");
let assets = JSON.parse(fs.readFileSync('./assets.json'));

chai.use(smock.matchers);

describe("StrategyIdle", function () {

    let account;
    let strategy;
    let usdc;
    let idleUsdc;

    before(async () => {
        await hre.run("compile");

        await deployments.fixture(['PortfolioManager', 'StrategyIdle', 'StrategyIdleSetting', 'BuyUsdc']);

        const {deployer} = await getNamedAccounts();
        account = deployer;
        usdc = await ethers.getContractAt("ERC20", assets.usdc);
        idleUsdc = await ethers.getContractAt("ERC20", assets.idleUsdc);
        strategy = await ethers.getContract('StrategyIdle');
        await strategy.setPortfolioManager(account);
    });


    describe("Stake 100 USDC", function () {

        let balanceUSDC;

        before(async () => {

            let balanceUsdcBefore = await usdc.balanceOf(account);
            await usdc.transfer(strategy.address, toUSDC(100));
            await strategy.stake(usdc.address, toUSDC(100));
            let balanceUsdcAfter = await usdc.balanceOf(account);

            balanceUSDC = fromUSDC(balanceUsdcBefore - balanceUsdcAfter) - 100;
        });

        it("Balance USDC should be eq 0 USDC", async function () {
            expect(balanceUSDC).to.eq(0);
        });

        it("Balance idleUsdc should be greater than 95", async function () {
            greatLess(fromE18(await idleUsdc.balanceOf(strategy.address)), 100, 5);
        });

        it("NetAssetValue should be greater than 99 less than 100", async function () {
            greatLess(fromUSDC(await strategy.netAssetValue()), 100, 1);
        });

        it("LiquidationValue should  be greater than 99 less than 100", async function () {
            greatLess(fromUSDC(await strategy.liquidationValue()), 100, 1);
        });


        describe("Unstake 50 USDC", function () {

            let balanceUSDC;

            before(async () => {

                let balanceUsdcBefore = await usdc.balanceOf(account);
                await strategy.unstake(usdc.address, toUSDC(50), account, false);
                let balanceUsdcAfter = await usdc.balanceOf(account);
                balanceUSDC = fromUSDC(balanceUsdcAfter - balanceUsdcBefore);
            });

            it("Balance USDC should be gte 50 USDC", async function () {
                expect(balanceUSDC).to.greaterThanOrEqual(50);
            });

            it("Balance idleUsdc should be greater 47", async function () {
                greatLess(fromE18(await idleUsdc.balanceOf(strategy.address)), 50, 3);
            });

            it("NetAssetValue should be eq 50", async function () {
                greatLess(fromUSDC(await strategy.netAssetValue()), 49, 1);
            });

            it("LiquidationValue should be eq 50", async function () {
                greatLess(fromUSDC(await strategy.liquidationValue()), 49, 1);
            });
        });

    });


    it("ClaimRewards should return 0", async function () {
        let balanceUsdcBefore = await usdc.balanceOf(account);
        await strategy.claimRewards(account);
        let balanceUsdcAfter = await usdc.balanceOf(account);

        let balanceUSDC = fromUSDC(balanceUsdcBefore - balanceUsdcAfter);
        expect(balanceUSDC).to.eq(0);
    });

});
