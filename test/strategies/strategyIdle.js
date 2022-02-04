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

describe("StrategyAave", function () {

    let account;
    let strategy;
    let usdc;
    let idleUsdc;
    let vault;

    before(async () => {
        await hre.run("compile");

        await deployments.fixture(['StrategyIdle', 'Vault', 'StrategyIdleSetting', 'BuyUsdc']);

        const {deployer} = await getNamedAccounts();
        account = deployer;
        usdc = await ethers.getContractAt("ERC20", assets.usdc);
        idleUsdc = await ethers.getContractAt("ERC20", assets.idleUsdc);
        strategy = await ethers.getContract('StrategyIdle');
        vault = await ethers.getContract('Vault');
    });


    describe("Stack 100 USDC", function () {

        let balanceUSDC;

        before(async () => {

            await usdc.approve(vault.address, toUSDC(100));
            let balanceUsdcBefore = await usdc.balanceOf(account);
            await strategy.stake(usdc.address, toUSDC(100), account);
            let balanceUsdcAfter = await usdc.balanceOf(account);

            balanceUSDC = fromUSDC(balanceUsdcBefore - balanceUsdcAfter) - 100;
        });

        it("Balance USDC should be eq 0 USDC", async function () {
            expect(balanceUSDC).to.eq(0);
        });

        it("Balance idleUsdc should be greater than 99", async function () {
            greatLess(fromE18(await idleUsdc.balanceOf(account)), 99);
        });

        it("NetAssetValue should be greater than 99 less than 100", async function () {
            greatLess(fromUSDC(await strategy.netAssetValue(account)), 100);
        });

        it("LiquidationValue should  be greater than 99 less than 100", async function () {
            greatLess(fromUSDC(await strategy.liquidationValue(account)), 100);
        });


        describe("Unstake 50 USDC", function () {

            let balanceUSDC;

            before(async () => {
                await idleUsdc.approve(strategy.address, await idleUsdc.balanceOf(account));

                let balanceUsdcBefore = await usdc.balanceOf(account);
                await strategy.unstake(usdc.address, toUSDC(50), account);
                let balanceUsdcAfter = await usdc.balanceOf(account);
                balanceUSDC = fromUSDC(balanceUsdcAfter - balanceUsdcBefore);
            });

            it("Balance USDC should be eq 50 USDC", async function () {
                greatLess(balanceUSDC, 50);
            });

            it("Balance idleUsdc should be eq 48", async function () {
                greatLess(fromE18(await idleUsdc.balanceOf(account)), 48);
            });

            it("NetAssetValue should be eq 50", async function () {
                greatLess(fromUSDC(await strategy.netAssetValue(account)), 49);
            });

            it("LiquidationValue should be eq 50", async function () {
                greatLess(fromUSDC(await strategy.liquidationValue(account)), 49);
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
