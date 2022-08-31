const {expect} = require("chai");
const chai = require("chai");
const {deployments, ethers, getNamedAccounts, upgrades} = require("hardhat");
const {resetHardhat} = require("@overnight-contracts/common/utils/tests");
const hre = require("hardhat");
let {DEFAULT} = require('@overnight-contracts/common/utils/assets');
const {constants} = require("@openzeppelin/test-helpers");
const {ZERO_ADDRESS} = constants;
const expectRevert = require("@overnight-contracts/common/utils/expectRevert");
const sampleModule = require("@openzeppelin/hardhat-upgrades/dist/utils/deploy-impl");
const {sharedBeforeEach} = require("@overnight-contracts/common/utils/sharedBeforeEach")

chai.use(require('chai-bignumber')());
const { solidity } =  require("ethereum-waffle");
chai.use(solidity);

describe("PortfolioManager set new cash strategy", function () {

    let asset;
    let mockCashStrategyA;
    let mockCashStrategyB;
    let pm;

    sharedBeforeEach(async () => {
        // need to run inside IDEA via node script running
        await hre.run("compile");
        await resetHardhat(process.env.STAND);

        const {deploy} = deployments;
        const {deployer} = await getNamedAccounts();

        await deployments.fixture(['base', 'setting', 'test']);

        let assetAddress;
        if (process.env.STAND === 'bsc') {
            assetAddress = DEFAULT.busd;
        } else {
            assetAddress = DEFAULT.usdc;
        }
        asset = await ethers.getContractAt("ERC20", assetAddress);
        mockCashStrategyA = await deploy("MockStrategy", {
            from: deployer,
            args: [assetAddress, 1],
            log: true,
            skipIfAlreadyDeployed: false
        });
        mockCashStrategyB = await deploy("MockStrategy", {
            from: deployer,
            args: [assetAddress, 2],
            log: true,
            skipIfAlreadyDeployed: false
        });



        pm = await deployContract("PortfolioManager")
        await pm.setAsset(asset.address);
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

        expect(await asset.balanceOf(mockCashStrategyA.address)).to.equal(0);
        expect(await asset.balanceOf(mockCashStrategyB.address)).to.equal(0);

        await expect(pm.setCashStrategy(mockCashStrategyB.address))
            .to.not.emit(pm, "CashStrategyRestaked")
            .withArgs(mockCashStrategyB.address);

        await expect(pm.setCashStrategy(mockCashStrategyB.address))
            .to.emit(pm, "CashStrategyAlreadySet")
            .withArgs(mockCashStrategyB.address);

        expect(await asset.balanceOf(mockCashStrategyA.address)).to.equal(0);
        expect(await asset.balanceOf(mockCashStrategyB.address)).to.equal(0);
    });

    it("Set new cash strategy when prev have liquidity", async function () {

        await pm.setCashStrategy(mockCashStrategyA.address);

        await asset.transfer(mockCashStrategyA.address, 1234);

        expect(await asset.balanceOf(mockCashStrategyA.address)).to.equal(1234);
        expect(await asset.balanceOf(mockCashStrategyB.address)).to.equal(0);

        await expect(pm.setCashStrategy(mockCashStrategyB.address))
            .to.emit(pm, "CashStrategyRestaked")
            .withArgs(1234);

        expect(await asset.balanceOf(mockCashStrategyA.address)).to.equal(0);
        expect(await asset.balanceOf(mockCashStrategyB.address)).to.equal(1234);

    });

});


describe("PortfolioManager not set cash strategy", function () {

    let pm;

    before(async () => {
        // need to run inside IDEA via node script running
        await hre.run("compile");

        const {deployer} = await getNamedAccounts();

        pm = await deployContract("PortfolioManager")
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

    let asset;
    let cashStrategy;
    let nonCashStrategy;
    let account;
    let pm;

    sharedBeforeEach(async () => {
        // need to run inside IDEA via node script running
        await hre.run("compile");
        await resetHardhat(process.env.STAND);

        const {deploy} = deployments;
        const {deployer} = await getNamedAccounts();
        account = deployer;

        await deployments.fixture(['test']);

        let assetAddress;
        if (process.env.STAND === 'bsc') {
            assetAddress = DEFAULT.busd;
        } else {
            assetAddress = DEFAULT.usdc;
        }
        asset = await ethers.getContractAt("ERC20", assetAddress);
        cashStrategy = await deploy("MockStrategy", {
            from: deployer,
            args: [assetAddress, 1],
            log: true,
            skipIfAlreadyDeployed: false
        });
        nonCashStrategy = await deploy("MockStrategy", {
            from: deployer,
            args: [assetAddress, 2],
            log: true,
            skipIfAlreadyDeployed: false
        });

        const signers = await ethers.getSigners();
        nonCashStrategy = await ethers.getContractAt('MockStrategy', nonCashStrategy.address, signers[0]);

        pm = await deployContract("PortfolioManager");
        let m2m = await deployContract('Mark2Market');

        await m2m.setPortfolioManager(pm.address);

        await pm.setAsset(asset.address);
        await pm.setExchanger(deployer);
        await pm.setMark2Market(m2m.address);


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

        await asset.transfer(pm.address, 100);
        await pm.deposit(asset.address, 100);

        expect(await asset.balanceOf(nonCashStrategy.address)).to.equal(90);
        expect(await asset.balanceOf(cashStrategy.address)).to.equal(10);

        await asset.transfer(pm.address, 5);
        await pm.deposit(asset.address, 5);

        expect(await asset.balanceOf(nonCashStrategy.address)).to.equal(90);
        expect(await asset.balanceOf(cashStrategy.address)).to.equal(15);

    });

    it("Deposit more then cash limit", async function () {

        await asset.transfer(pm.address, 100);
        await pm.deposit(asset.address, 100);

        expect(await asset.balanceOf(nonCashStrategy.address)).to.equal(90);
        expect(await asset.balanceOf(cashStrategy.address)).to.equal(10);

        await asset.transfer(pm.address, 100);
        await pm.deposit(asset.address, 100);

        expect(await asset.balanceOf(nonCashStrategy.address)).to.equal(180);
        expect(await asset.balanceOf(cashStrategy.address)).to.equal(20);

    });

    it("Withdraw less then cash amount", async function () {

        await asset.transfer(pm.address, 100);
        await pm.deposit(asset.address, 100);

        expect(await asset.balanceOf(nonCashStrategy.address)).to.equal(90);
        expect(await asset.balanceOf(cashStrategy.address)).to.equal(10);

        await pm.withdraw(asset.address, 5);

        expect(await asset.balanceOf(nonCashStrategy.address)).to.equal(90);
        expect(await asset.balanceOf(cashStrategy.address)).to.equal(5);

    });

    it("Withdraw more then cash amount", async function () {

        await asset.transfer(pm.address, 200);
        await pm.deposit(asset.address, 200);

        expect(await asset.balanceOf(nonCashStrategy.address)).to.equal(180);
        expect(await asset.balanceOf(cashStrategy.address)).to.equal(20);

        await pm.withdraw(asset.address, 100);

        expect(await asset.balanceOf(nonCashStrategy.address)).to.equal(90);
        expect(await asset.balanceOf(cashStrategy.address)).to.equal(10);

    });

    it("Withdraw more then cash amount = revert: PM: NAV less than expected", async function () {

        await asset.transfer(pm.address, 200);
        await pm.deposit(asset.address, 200);

        expect(await asset.balanceOf(nonCashStrategy.address)).to.equal(180);
        expect(await asset.balanceOf(cashStrategy.address)).to.equal(20);

        await nonCashStrategy.setNavLess(true);
        await expectRevert(pm.withdraw(asset.address, 100), "PM: NAV less than expected");


    });


});

async function deployContract(name){
    const factory = await ethers.getContractFactory(name);
    let contract = await upgrades.deployProxy(factory, {kind: 'uups'});
    await contract.deployTransaction.wait();
    await sampleModule.deployProxyImpl(hre, factory, {kind: 'uups'}, contract.address);

    return contract;
}
