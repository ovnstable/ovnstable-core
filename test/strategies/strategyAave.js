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
    let amUsdc;

    before(async () => {
        await hre.run("compile");

        await deployments.fixture(['StrategyAave', 'Vault', 'StrategyAaveSetting', 'BuyUsdc']);

        const {deployer} = await getNamedAccounts();
        account = deployer;
        usdc = await ethers.getContractAt("ERC20", assets.usdc);
        amUsdc = await ethers.getContractAt("ERC20", assets.amUsdc);
        strategy = await ethers.getContract('StrategyAave');
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

        it("Balance Am3CrvGauge should be eq 100", async function () {
            expect(fromE6(await amUsdc.balanceOf(account))).to.eq(100);
        });

        it("NetAssetValue should be 100", async function () {
            expect(fromUSDC(await strategy.netAssetValue(account))).to.eq(100);
        });

        it("LiquidationValue should be 100", async function () {
            expect(fromUSDC(await strategy.liquidationValue(account))).to.eq(100);
        });


        describe("Unstake 50 USDC", function () {

            let balanceUSDC;

            before(async () => {
                await amUsdc.approve(strategy.address, await amUsdc.balanceOf(account));

                let balanceUsdcBefore = await usdc.balanceOf(account);
                await strategy.unstake(usdc.address, toUSDC(50), account);
                let balanceUsdcAfter = await usdc.balanceOf(account);
                balanceUSDC = fromUSDC(balanceUsdcAfter-balanceUsdcBefore);
            });

            it("Balance USDC should be eq 50 USDC", async function () {
                expect(balanceUSDC).to.eq(50);
            });

            it("Balance AmUsdc should be eq 50", async function () {
                expect(fromE6(await amUsdc.balanceOf(account))).to.greaterThanOrEqual(50);
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
