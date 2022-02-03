const {expect} = require("chai");
const chai = require("chai");
const {deployments, ethers, getNamedAccounts} = require('hardhat');
const {smock} = require("@defi-wonderland/smock");

const fs = require("fs");
const {fromAmUSDC, fromE6, toUSDC, fromUSDC, fromWmatic, fromOvn, fromE18} = require("../../utils/decimals");
const hre = require("hardhat");
let assets = JSON.parse(fs.readFileSync('./assets.json'));
const BN = require('bignumber.js');

chai.use(smock.matchers);

describe("StrategyAave", function () {

    let account;
    let strategy;
    let usdc;
    let idleUsdc;

    before(async () => {
        await hre.run("compile");

        await deployments.fixture(['StrategyIdle', 'StrategyIdleSetting', 'BuyUsdc']);

        const {deployer} = await getNamedAccounts();
        account = deployer;
        usdc = await ethers.getContractAt("ERC20", assets.usdc);
        idleUsdc = await ethers.getContractAt("ERC20", assets.idleUsdc);
        strategy = await ethers.getContract('StrategyIdle');
    });


    describe("Stack 100 USDC", function () {

        let balanceUSDC;

        before(async () => {

            await usdc.approve(strategy.address, toUSDC(100));
            let balanceUsdcBefore = await usdc.balanceOf(account);
            await strategy.stake(usdc.address, toUSDC(100), account);
            let balanceUsdcAfter = await usdc.balanceOf(account);

            balanceUSDC = fromUSDC(balanceUsdcBefore-balanceUsdcAfter)-100;
        });

        it("Balance USDC should be eq 0 USDC", async function () {
            expect(balanceUSDC).to.eq(0);
        });

        it("Balance idleUsdc should be greater than 98", async function () {
            expect(fromE18(await idleUsdc.balanceOf(account))).to.greaterThanOrEqual(98);
        });

        it("NetAssetValue should be greater than 98", async function () {
            expect(fromUSDC(await strategy.netAssetValue(account))).to.greaterThanOrEqual(98);
        });

        it("LiquidationValue should  be greater than 98", async function () {
            expect(fromUSDC(await strategy.liquidationValue(account))).to.greaterThanOrEqual(98);
        });


        describe("Unstake 50 USDC", function () {

            let balanceUSDC;

            before(async () => {
                await idleUsdc.approve(strategy.address, await idleUsdc.balanceOf(account));

                let balanceUsdcBefore = await usdc.balanceOf(account);
                await strategy.unstake(usdc.address, toUSDC(50), account);
                let balanceUsdcAfter = await usdc.balanceOf(account);
                balanceUSDC = fromUSDC(balanceUsdcAfter-balanceUsdcBefore);
            });

            it("Balance USDC should be eq 49 USDC", async function () {
                expect(balanceUSDC).to.greaterThan(49);
            });

            it("Balance idleUsdc should be eq 49", async function () {
                expect(fromE18(await idleUsdc.balanceOf(account))).to.greaterThan(49);
            });

            it("NetAssetValue should be eq 50", async function () {
                expect(fromUSDC(await strategy.netAssetValue(account))).to.greaterThanOrEqual(50);
            });

            it("LiquidationValue should be eq 50", async function () {
                expect(fromUSDC(await strategy.liquidationValue(account))).to.greaterThanOrEqual(50);
            });
        });

    });


    it("ClaimRewards should return 0", async function () {
        let balanceUsdcBefore = await usdc.balanceOf(account);
        await strategy.claimRewards(account);
        let balanceUsdcAfter = await usdc.balanceOf(account);

        let balanceUSDC = fromUSDC(balanceUsdcBefore-balanceUsdcAfter);
        expect(balanceUSDC).to.eq(0);
    });

});
