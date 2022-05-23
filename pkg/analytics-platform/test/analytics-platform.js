const {expect} = require("chai");
const {deployments, ethers, getNamedAccounts} = require('hardhat');
const {toUSDC} = require("@overnight-contracts/common/utils/decimals");
const hre = require("hardhat");
let {POLYGON, DEFAULT} = require('@overnight-contracts/common/utils/assets');
const chai = require("chai");
chai.use(require('chai-bignumber')());

const {evmCheckpoint, evmRestore} = require('@overnight-contracts/common/utils/sharedBeforeEach')
const {fromUSDC} = require("../../common/utils/decimals");


describe("AnalyticsPlatform", function () {

    let account;
    let platform;
    let usdc;
    let strategy;

    before(async () => {
        await hre.run("compile");

        await deployments.fixture(['AnalyticsPlatform', 'AnalyticsPlatformSetting', 'test']);

        const {deployer} = await getNamedAccounts();
        account = deployer;
        platform = await ethers.getContract("AnalyticsPlatform");
        usdc = await ethers.getContractAt("IERC20", POLYGON.usdc);

    });


    describe("Add Strategy", function () {

        let strategies;
        let nav;

        before(async () => {

            await evmCheckpoint("default");

            strategy = await deployments.deploy("MockStrategy", {
                from: account,
                args: [DEFAULT.usdc, 1],
                log: true,
                skipIfAlreadyDeployed: false
            });

            strategy = await ethers.getContractAt("IStrategy", strategy.address);

            await usdc.transfer(platform.address, toUSDC(10))
            await platform.addStrategy(strategy.address, toUSDC(10));

            strategies = await platform.getStrategies();
            nav = await strategy.netAssetValue();

        });

        it("Strategies length == 1", async function () {
            expect(1).to.equal(strategies.length);
        });

        it("Strategies[0] == address", async function () {
            expect(strategy.address).to.equal(strategies[0]);
        });

        it("Strategy netAssetValue = $10", async function () {
            expect(nav).to.equal(toUSDC(10));
        });

        describe("Remove Strategy", function () {

            let strategies;
            let nav;

            before(async () => {


                strategy = await deployments.deploy("MockStrategy", {
                    from: account,
                    args: [DEFAULT.usdc, 1],
                    log: true,
                    skipIfAlreadyDeployed: false
                });

                strategy = await ethers.getContractAt("IStrategy", strategy.address);

                await platform.removeStrategy(strategy.address);

                strategies = await platform.getStrategies();
                nav = await strategy.netAssetValue();

                await evmRestore("default");

            });

            it("Strategies length == 0", async function () {
                expect(strategies.length).to.equal(0);
            });

            it("Strategy netAssetValue = $0", async function () {
                expect(nav).to.equal(toUSDC(0));
            });

        });

    });

    describe("Take Bank", function () {

        let usdcBalanceBefore;
        let usdcBalanceAfter;

        before(async () => {

            await evmCheckpoint("default");

            usdcBalanceBefore = fromUSDC(await usdc.balanceOf(account));
            await usdc.transfer(platform.address, toUSDC(10));

            await platform.takeBank(account);

            usdcBalanceAfter = fromUSDC(await usdc.balanceOf(account));

            await evmRestore("default");

        });

        it("USDC balance equal", async function () {
            expect(usdcBalanceBefore).to.equal(usdcBalanceAfter);
        });


    });


    describe("ClaimAndBalance", function () {

        let usdcBalanceBefore;
        let usdcBalanceAfter;
        let diff;

        before(async () => {

            await evmCheckpoint("default");

            strategy = await deployments.deploy("MockStrategy", {
                from: account,
                args: [DEFAULT.usdc, 1],
                log: true,
                skipIfAlreadyDeployed: false
            });

            strategy = await ethers.getContractAt("IStrategy", strategy.address);

            await usdc.transfer(platform.address, toUSDC(10))
            await platform.addStrategy(strategy.address, toUSDC(10));

            usdcBalanceBefore = fromUSDC(await usdc.balanceOf(platform.address));
            await platform.claimRewardsAndBalance();
            usdcBalanceAfter = fromUSDC(await usdc.balanceOf(platform.address));

            diff = usdcBalanceAfter - usdcBalanceBefore;
        });

        it("Balance changed", async function () {
            expect(diff).to.equal(1);
        });


    });


});

