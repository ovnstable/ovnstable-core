const {expect} = require("chai");
const {deployments, ethers, getNamedAccounts} = require('hardhat');
const {toUSDC} = require("@overnight-contracts/common/utils/decimals");
const hre = require("hardhat");
let {POLYGON, DEFAULT} = require('@overnight-contracts/common/utils/assets');
const chai = require("chai");
chai.use(require('chai-bignumber')());

const {evmCheckpoint, evmRestore} = require('@overnight-contracts/common/utils/sharedBeforeEach')


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

            await evmRestore("default");

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

    });


    describe("Remove Strategy", function () {

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
            await platform.removeStrategy(strategy.address);

            strategies = await platform.getStrategies();
            nav = await strategy.netAssetValue();

            await evmRestore("default");

        });

        it("Strategies length == 0", async function () {
            expect(0).to.equal(strategies.length);
        });

        it("Strategy netAssetValue = $10", async function () {
            expect(nav).to.equal(toUSDC(0));
        });

    });

});

