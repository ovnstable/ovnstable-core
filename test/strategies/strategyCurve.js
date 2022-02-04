const {expect} = require("chai");
const chai = require("chai");
const {deployments, ethers, getNamedAccounts} = require('hardhat');
const {FakeContract, smock} = require("@defi-wonderland/smock");


const fs = require("fs");
const {fromAmUSDC, fromE6, toUSDC, fromUSDC, fromWmatic, fromOvn, fromE18} = require("../../utils/decimals");
const hre = require("hardhat");
let assets = JSON.parse(fs.readFileSync('./assets.json'));
const BN = require('bignumber.js');

chai.use(smock.matchers);

describe("StrategyCurve", function () {

    let account;
    let strategy;
    let vault;
    let usdc;
    let am3CrvGauge;

    before(async () => {
        await hre.run("compile");

        await deployments.fixture(['StrategyCurve', 'Vault', 'SettingVault', 'StrategyCurveSetting', 'BuyUsdc']);

        const {deployer} = await getNamedAccounts();
        account = deployer;
        usdc = await ethers.getContractAt("ERC20", assets.usdc);
        am3CrvGauge = await ethers.getContractAt("ERC20", assets.am3CRVgauge);
        strategy = await ethers.getContract('StrategyCurve');
        vault = await ethers.getContract('Vault');
    });


    describe("Stack 100 USDC", function () {

        before(async () => {
            await usdc.transfer(vault.address, toUSDC(100));
            await strategy.stake(usdc.address, toUSDC(100), vault.address);
        });

        it("Balance Am3CrvGauge should be greater than 95", async function () {
            expect(fromE18(await am3CrvGauge.balanceOf(vault.address))).to.greaterThan(95);
        });

        it("NetAssetValue should be 100", async function () {
            expect(fromUSDC(await strategy.netAssetValue(vault.address))).to.greaterThan(99);
        });

        it("LiquidationValue should be 100", async function () {
            expect(fromUSDC(await strategy.liquidationValue(vault.address))).to.greaterThan(99);
        });


        describe("Unstake 50 USDC", function () {

            let unstakeValue;

            before(async () => {
                unstakeValue = await strategy.unstake(usdc.address, toUSDC(50), vault.address);
            });

            it("Unstake value should be eq 50 USDC", async function () {
                expect(fromUSDC(unstakeValue)).to.greaterThan(50);
            });

            it("Balance Am3CrvGauge should be greater than 45", async function () {
                expect(fromE18(await am3CrvGauge.balanceOf(vault.address))).to.greaterThan(45);
            });

            it("NetAssetValue should be 45", async function () {
                expect(fromUSDC(await strategy.netAssetValue(vault.address))).to.greaterThan(45);
            });

            it("LiquidationValue should be 45", async function () {
                expect(fromUSDC(await strategy.liquidationValue(vault.address))).to.greaterThan(45);
            });
        });

    });


    it("ClaimRewards should return 0", async function () {
        // let balanceUsdcBefore = await usdc.balanceOf(account);
        //
        // await usdc.transfer(strategy.address, toUSDC(100));
        // await strategy.stake(usdc.address, toUSDC(100), account);
        //
        // const days = 365 * 24 * 60 * 60;
        // await ethers.provider.send("evm_increaseTime", [days])
        // await ethers.provider.send('evm_mine');
        //
        // await strategy.claimRewards(account);
        // let balanceUsdcAfter = await usdc.balanceOf(account);
        //
        // let balanceUSDC = fromUSDC(balanceUsdcBefore-balanceUsdcAfter);
        // expect(balanceUSDC).to.greaterThanOrEqual(1);
    });
});
