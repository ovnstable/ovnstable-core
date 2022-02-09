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

describe("StrategyCurve", function () {

    let account;
    let strategy;
    let usdc;
    let am3CrvGauge;

    before(async () => {
        await hre.run("compile");

        await deployments.fixture(['PortfolioManager', 'StrategyCurve', 'StrategyCurveSetting', 'BuyUsdc']);

        const {deployer} = await getNamedAccounts();
        account = deployer;
        usdc = await ethers.getContractAt("ERC20", assets.usdc);
        am3CrvGauge = await ethers.getContractAt("ERC20", assets.am3CRVgauge);
        strategy = await ethers.getContract('StrategyCurve');
        await strategy.setPortfolioManager(account);
    });


    describe("Stack 100 USDC", function () {

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

        it("Balance am3CRVgauge should be greater than 95", async function () {
            greatLess(fromE18(await am3CrvGauge.balanceOf(strategy.address)), 95, 1);
        });

        it("NetAssetValue should be greater than 99 less than 100", async function () {
            greatLess(fromUSDC(await strategy.netAssetValue()), 100, 1);
        });

        it("LiquidationValue should  be greater than 99 less than 100", async function () {
            greatLess(fromUSDC(await strategy.liquidationValue()), 100, 1);
        });

        it("ClaimRewards should return 0", async function () {

            // wait 7 days
            const days = 7 * 24 * 60 * 60;
            await ethers.provider.send("evm_increaseTime", [days])
            await ethers.provider.send('evm_mine');

            let balanceUsdcBefore = await usdc.balanceOf(account);
            await strategy.claimRewards(account);
            let balanceUsdcAfter = await usdc.balanceOf(account);

            let balanceUSDC = fromUSDC(balanceUsdcAfter - balanceUsdcBefore);
            expect(balanceUSDC).to.greaterThan(0);
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

            it("Balance am3CRVgauge should be eq 48", async function () {
                greatLess(fromE18(await am3CrvGauge.balanceOf(strategy.address)), 48, 1);
            });

            it("NetAssetValue should be eq 50", async function () {
                greatLess(fromUSDC(await strategy.netAssetValue()), 50, 1);
            });

            it("LiquidationValue should be eq 50", async function () {
                greatLess(fromUSDC(await strategy.liquidationValue()), 50, 1);
            });
        });

    });


});
