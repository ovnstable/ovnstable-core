const {expect} = require("chai");
const chai = require("chai");
const {deployments, ethers, getNamedAccounts, upgrades} = require("hardhat");

const fs = require("fs");
const hre = require("hardhat");
let assets = JSON.parse(fs.readFileSync('./polygon_assets.json'));
const {constants} = require("@openzeppelin/test-helpers");
const {ZERO_ADDRESS} = constants;
const expectRevert = require("../../utils/expectRevert");
const sampleModule = require("@openzeppelin/hardhat-upgrades/dist/utils/deploy-impl");
const {sharedBeforeEach} = require("../common/sharedBeforeEach")

chai.use(require('chai-bignumber')());


describe("PortfolioManager set new cash strategy", function () {

    let usdc;
    let mockCashStrategyA;
    let mockCashStrategyB;
    let pm;

    sharedBeforeEach(async () => {
        // need to run inside IDEA via node script running
        await hre.run("compile");

        const {deploy} = deployments;
        const {deployer} = await getNamedAccounts();

        await deployments.fixture(['PolygonBuyUsdc']);

        usdc = await ethers.getContractAt("ERC20", assets.usdc);
        mockCashStrategyA = await deploy("MockStrategy", {
            from: deployer,
            args: [assets.usdc, 1],
            log: true,
            skipIfAlreadyDeployed: false
        });
        mockCashStrategyB = await deploy("MockStrategy", {
            from: deployer,
            args: [assets.usdc, 2],
            log: true,
            skipIfAlreadyDeployed: false
        });


        const contractFactory = await ethers.getContractFactory("PortfolioManager");
        pm = await upgrades.deployProxy(contractFactory, {kind: 'uups'});
        await pm.deployTransaction.wait();
        await sampleModule.deployImpl(hre, contractFactory, {kind: 'uups'}, pm.address);

        await pm.setUsdc(usdc.address);
    });


    it("Set new cash strategy", async function () {
        await expectRevert(pm.setCashStrategy(ZERO_ADDRESS), "Zero address not allowed");

        expect(await pm.cashStrategy()).eq(ZERO_ADDRESS);

        await expect(pm.setCashStrategy(mockCashStrategyA.address))
            .to.emit(pm, "CashStrategyUpdated")
            .withArgs(mockCashStrategyA.address);

        await expect(pm.setCashStrategy(mockCashStrategyA.address))
            .to.emit(pm, "CashStrategyAlreadySet")
            .withArgs(mockCashStrategyA.address);

        expect(await usdc.balanceOf(mockCashStrategyA.address)).to.equal(0);
        expect(await usdc.balanceOf(mockCashStrategyB.address)).to.equal(0);

        await expect(pm.setCashStrategy(mockCashStrategyB.address))
            .to.not.emit(pm, "CashStrategyRestaked")
            .withArgs(mockCashStrategyB.address);

        await expect(pm.setCashStrategy(mockCashStrategyB.address))
            .to.emit(pm, "CashStrategyAlreadySet")
            .withArgs(mockCashStrategyB.address);

        expect(await usdc.balanceOf(mockCashStrategyA.address)).to.equal(0);
        expect(await usdc.balanceOf(mockCashStrategyB.address)).to.equal(0);
    });

    it("Set new cash strategy when prev have liquidity", async function () {

        await pm.setCashStrategy(mockCashStrategyA.address);

        await usdc.transfer(mockCashStrategyA.address, 1234);

        expect(await usdc.balanceOf(mockCashStrategyA.address)).to.equal(1234);
        expect(await usdc.balanceOf(mockCashStrategyB.address)).to.equal(0);

        await expect(pm.setCashStrategy(mockCashStrategyB.address))
            .to.emit(pm, "CashStrategyRestaked")
            .withArgs(1234);

        expect(await usdc.balanceOf(mockCashStrategyA.address)).to.equal(0);
        expect(await usdc.balanceOf(mockCashStrategyB.address)).to.equal(1234);

    });

});


describe("PortfolioManager not set cash strategy", function () {

    let pm;

    before(async () => {
        // need to run inside IDEA via node script running
        await hre.run("compile");

        const {deployer} = await getNamedAccounts();

        const contractFactory = await ethers.getContractFactory("PortfolioManager");
        pm = await upgrades.deployProxy(contractFactory, {kind: 'uups'});
        await pm.deployTransaction.wait();
        await sampleModule.deployImpl(hre, contractFactory, {kind: 'uups'}, pm.address);

        await pm.setExchanger(deployer);
    });


    it("Deposit should fail", async function () {
        expect(await pm.cashStrategy()).eq(ZERO_ADDRESS);
        await expectRevert(pm.deposit("0x0000000000000000000000000000000000000001", 1), "Cash strategy not set yet");
    });

    it("Withdraw should fail", async function () {
        expect(await pm.cashStrategy()).eq(ZERO_ADDRESS);
        await expectRevert(pm.withdraw("0x0000000000000000000000000000000000000001", 1), "Cash strategy not set yet");
    });

});


describe("PortfolioManager", function () {

    let usdc;
    let cashStrategy;
    let nonCashStrategy;
    let account;
    let pm;

    sharedBeforeEach(async () => {
        // need to run inside IDEA via node script running
        await hre.run("compile");

        const {deploy} = deployments;
        const {deployer} = await getNamedAccounts();
        account = deployer;

        await deployments.fixture(['PolygonBuyUsdc']);

        usdc = await ethers.getContractAt("ERC20", assets.usdc);
        cashStrategy = await deploy("MockStrategy", {
            from: deployer,
            args: [assets.usdc, 1],
            log: true,
            skipIfAlreadyDeployed: false
        });
        nonCashStrategy = await deploy("MockStrategy", {
            from: deployer,
            args: [assets.usdc, 2],
            log: true,
            skipIfAlreadyDeployed: false
        });


        const contractFactory = await ethers.getContractFactory("PortfolioManager");
        pm = await upgrades.deployProxy(contractFactory, {kind: 'uups'});
        await pm.deployTransaction.wait();
        await sampleModule.deployImpl(hre, contractFactory, {kind: 'uups'}, pm.address);

        await pm.setUsdc(usdc.address);
        await pm.setExchanger(deployer);


        let weights = [{
            strategy: nonCashStrategy.address,
            minWeight: 0,
            targetWeight: 90000,
            maxWeight: 100000,
            enabled: true,
            enabledReward: false,
        }, {
            strategy: cashStrategy.address,
            minWeight: 0,
            targetWeight: 10000,
            maxWeight: 20000,
            enabled: true,
            enabledReward: false,
        }]

        await pm.setStrategyWeights(weights);
        await pm.setCashStrategy(cashStrategy.address);
    });


    it("Deposit less then cash limit", async function () {

        await usdc.transfer(pm.address, 100);
        await pm.deposit(usdc.address, 100);

        expect(await usdc.balanceOf(nonCashStrategy.address)).to.equal(90);
        expect(await usdc.balanceOf(cashStrategy.address)).to.equal(10);

        await usdc.transfer(pm.address, 5);
        await pm.deposit(usdc.address, 5);

        expect(await usdc.balanceOf(nonCashStrategy.address)).to.equal(90);
        expect(await usdc.balanceOf(cashStrategy.address)).to.equal(15);

    });

    it("Deposit more then cash limit", async function () {

        await usdc.transfer(pm.address, 100);
        await pm.deposit(usdc.address, 100);

        expect(await usdc.balanceOf(nonCashStrategy.address)).to.equal(90);
        expect(await usdc.balanceOf(cashStrategy.address)).to.equal(10);

        await usdc.transfer(pm.address, 100);
        await pm.deposit(usdc.address, 100);

        expect(await usdc.balanceOf(nonCashStrategy.address)).to.equal(180);
        expect(await usdc.balanceOf(cashStrategy.address)).to.equal(20);

    });

    it("Withdraw less then cash amount", async function () {

        await usdc.transfer(pm.address, 100);
        await pm.deposit(usdc.address, 100);

        expect(await usdc.balanceOf(nonCashStrategy.address)).to.equal(90);
        expect(await usdc.balanceOf(cashStrategy.address)).to.equal(10);

        await pm.withdraw(usdc.address, 5);

        expect(await usdc.balanceOf(nonCashStrategy.address)).to.equal(90);
        expect(await usdc.balanceOf(cashStrategy.address)).to.equal(5);

    });

    it("Withdraw more then cash amount", async function () {

        await usdc.transfer(pm.address, 200);
        await pm.deposit(usdc.address, 200);

        expect(await usdc.balanceOf(nonCashStrategy.address)).to.equal(180);
        expect(await usdc.balanceOf(cashStrategy.address)).to.equal(20);

        await pm.withdraw(usdc.address, 100);

        expect(await usdc.balanceOf(nonCashStrategy.address)).to.equal(90);
        expect(await usdc.balanceOf(cashStrategy.address)).to.equal(10);

    });

});

