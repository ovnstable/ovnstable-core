const {expect} = require("chai");
const chai = require("chai");
const {deployments, ethers, getNamedAccounts} = require('hardhat');
const {smock} = require("@defi-wonderland/smock");

const fs = require("fs");
const {greatLess} = require('../../utils/tests');
const {fromE6, toUSDC, fromUSDC, fromE18, fromOvn, fromE18} = require("../../utils/decimals");
const hre = require("hardhat");
const BN = require('bignumber.js');
const {resetHardhat} = require("../../utils/tests");
let assets = JSON.parse(fs.readFileSync('./assets.json'));

chai.use(smock.matchers);


describe("StrategyAave. Stake/unstake", function () {

    let account;
    let strategy;
    let usdc;
    let amUsdc;

    before(async () => {
        await hre.run("compile");
        await resetHardhat();

        await deployments.fixture(['PortfolioManager', 'StrategyAave', 'StrategyAaveSetting', 'BuyUsdc']);

        const {deployer} = await getNamedAccounts();
        account = deployer;

        strategy = await ethers.getContract('StrategyAave');
        await strategy.setPortfolioManager(account);

        usdc = await ethers.getContractAt("ERC20", assets.usdc);
        amUsdc = await ethers.getContractAt("ERC20", assets.amUsdc);
    });


    describe("Stake 100 USDC", function () {

        let balanceUsdc;
        let balanceAmUsdc;

        before(async () => {

            let balanceUsdcBefore = await usdc.balanceOf(account);
            let balanceAmUsdcBefore = await amUsdc.balanceOf(strategy.address);

            await usdc.transfer(strategy.address, toUSDC(100));
            await strategy.stake(usdc.address, toUSDC(100));

            let balanceUsdcAfter = await usdc.balanceOf(account);
            let balanceAmUsdcAfter = await amUsdc.balanceOf(strategy.address);

            balanceUsdc = fromUSDC(balanceUsdcBefore - balanceUsdcAfter);
            balanceAmUsdc = fromE6(balanceAmUsdcAfter - balanceAmUsdcBefore);

            console.log("balanceUsdcBefore: " + fromUSDC(balanceUsdcBefore));
            console.log("balanceUsdcAfter: " + fromUSDC(balanceUsdcAfter));
            console.log("balanceUsdc: " + balanceUsdc);
            console.log("balanceAmUsdcBefore: " + fromE6(balanceAmUsdcBefore));
            console.log("balanceAmUsdcAfter: " + fromE6(balanceUsdcBefore));
            console.log("balanceAmUsdc: " + balanceAmUsdc);
        });

        it("Balance USDC should be greater than 99 less than 101", async function () {
            greatLess(balanceUsdc, 100, 1);
        });

        it("Balance amUsdc should be greater than 90 less than 100", async function () {
            greatLess(balanceAmUsdc, 95, 5);
        });

        it("NetAssetValue USDC should be greater than 99 less than 101", async function () {
            greatLess(fromUSDC(await strategy.netAssetValue()), 100, 1);
        });

        it("LiquidationValue USDC should be greater than 99 less than 101", async function () {
            greatLess(fromUSDC(await strategy.liquidationValue()), 100, 1);
        });

        describe("Unstake 50 USDC", function () {

            let balanceUsdc;
            let balanceAmUsdc;

            before(async () => {

                let balanceUsdcBefore = await usdc.balanceOf(account);
                let balanceAmUsdcBefore = await amUsdc.balanceOf(strategy.address);

                await strategy.unstake(usdc.address, toUSDC(50), account, false);

                let balanceUsdcAfter = await usdc.balanceOf(account);
                let balanceAmUsdcAfter = await amUsdc.balanceOf(strategy.address);

                balanceUsdc = fromUSDC(balanceUsdcAfter - balanceUsdcBefore);
                balanceAmUsdc = fromE6(balanceAmUsdcBefore - balanceAmUsdcAfter);

                console.log("balanceUsdcBefore: " + fromUSDC(balanceUsdcBefore));
                console.log("balanceUsdcAfter: " + fromUSDC(balanceUsdcAfter));
                console.log("balanceUsdc: " + balanceUsdc);
                console.log("balanceAmUsdcBefore: " + fromE6(balanceAmUsdcBefore));
                console.log("balanceAmUsdcAfter: " + fromE6(balanceUsdcBefore));
                console.log("balanceAmUsdc: " + balanceAmUsdc);
            });

            it("Balance USDC should be greater than 49 less than 51", async function () {
                greatLess(balanceUsdc, 50, 1);
            });

            it("Balance amUsdc should be greater than 49 less than 51", async function () {
                greatLess(balanceAmUsdc, 50, 1);
            });

            it("NetAssetValue USDC should be greater than 49 less than 51", async function () {
                greatLess(fromUSDC(await strategy.netAssetValue()), 50, 1);
            });

            it("LiquidationValue USDC should be greater than 49 less than 51", async function () {
                greatLess(fromUSDC(await strategy.liquidationValue()), 50, 1);
            });

            describe("Unstake Full", function () {

                let balanceUSDC;
                let balanceAmUsdc;

                before(async () => {

                    let balanceUsdcBefore = await usdc.balanceOf(account);
                    let balanceAmUsdcBefore = await amUsdc.balanceOf(strategy.address);

                    await strategy.unstake(usdc.address, 0, account, true);

                    let balanceUsdcAfter = await usdc.balanceOf(account);
                    let balanceAmUsdcAfter = await amUsdc.balanceOf(strategy.address);

                    balanceUsdc = fromUSDC(balanceUsdcAfter - balanceUsdcBefore);
                    balanceAmUsdc = fromE6(balanceAmUsdcBefore - balanceAmUsdcAfter);

                    console.log("balanceUsdcBefore: " + fromUSDC(balanceUsdcBefore));
                    console.log("balanceUsdcAfter: " + fromUSDC(balanceUsdcAfter));
                    console.log("balanceUsdc: " + balanceUsdc);
                    console.log("balanceAmUsdcBefore: " + fromE6(balanceAmUsdcBefore));
                    console.log("balanceAmUsdcAfter: " + fromE6(balanceUsdcBefore));
                    console.log("balanceAmUsdc: " + balanceAmUsdc);
                });

                it("Balance USDC should be greater than 49 less than 51", async function () {
                    greatLess(balanceUsdc, 50, 1);
                });

                it("Balance amUsdc should be greater than 49 less than 51", async function () {
                    greatLess(balanceAmUsdc, 50, 1);
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