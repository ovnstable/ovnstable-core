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

const {waffle} = require("hardhat");
const {transferETH} = require("@overnight-contracts/common/utils/script-utils");
const {provider} = waffle;

let assetAddress;
if (process.env.STAND === 'bsc') {
    assetAddress = DEFAULT.busd;
} else {
    assetAddress = DEFAULT.usdc;
}

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

describe("PortfolioManager: addStrategy", function () {

    let pm;
    let strategy1;
    let strategy2;
    let account;
    let notAdminUser;

    sharedBeforeEach(async () => {
        await hre.run("compile");
        await resetHardhat(process.env.STAND);

        const {deploy} = deployments;
        const {deployer} = await getNamedAccounts();

        account = deployer;

        await deployments.fixture([]);

        notAdminUser = provider.createEmptyWallet();
        await transferETH(1, notAdminUser.address);

        pm = await deployContract("PortfolioManager");

        strategy1 = await deploy("MockStrategy", {
            from: deployer,
            args: [assetAddress, 1],
            log: true,
            skipIfAlreadyDeployed: false
        });

        strategy2 = await deploy("MockStrategy", {
            from: deployer,
            args: [assetAddress, 2],
            log: true,
            skipIfAlreadyDeployed: false
        });
    });



    it("success added", async function () {
        await pm.addStrategy(strategy1.address);

        let weight = await pm.getStrategyWeight(strategy1.address);

        expect(strategy1.address).to.eq(weight.strategy);
        expect(0).to.eq(weight.minWeight);
        expect(0).to.eq(weight.targetWeight);
        expect(0).to.eq(weight.maxWeight);
        expect(false).to.eq(weight.enabled);
        expect(false).to.eq(weight.enabledReward);

        let index = await pm.strategyWeightPositions(strategy1.address);
        expect(0).to.eq(index);


        let weights = await pm.getAllStrategyWeights();
        expect(1).to.eq(weights.length);

        expect(strategy1.address).to.eq(weights[0].strategy);
    });

    it("Call only onlyAdmin", async function () {
        await expectRevert(pm.connect(notAdminUser).addStrategy(strategy1.address), 'Restricted to admins');
    });

    it("Strategy already exist", async function () {
        await pm.addStrategy(strategy1.address);
        await expectRevert(pm.addStrategy(strategy1.address), 'Strategy already exist');
    });

    it("Two strategy added", async function () {
        await pm.addStrategy(strategy1.address);
        await pm.addStrategy(strategy2.address);

        let index = await pm.strategyWeightPositions(strategy1.address);
        expect(0).to.eq(index);

        index = await pm.strategyWeightPositions(strategy2.address);
        expect(1).to.eq(index);

        let weights = await pm.getAllStrategyWeights();
        expect(2).to.eq(weights.length);

        expect(strategy1.address).to.eq(weights[0].strategy);
        expect(strategy2.address).to.eq(weights[1].strategy);
    });

});



describe("PortfolioManager: removeStrategy", function () {

    let pm;
    let strategy1;
    let strategy2;
    let strategy3;
    let account;
    let notAdminUser;

    sharedBeforeEach(async () => {
        await hre.run("compile");
        await resetHardhat(process.env.STAND);

        const {deploy} = deployments;
        const {deployer} = await getNamedAccounts();

        account = deployer;

        await deployments.fixture([]);

        notAdminUser = provider.createEmptyWallet();
        await transferETH(1, notAdminUser.address);

        pm = await deployContract("PortfolioManager");
        await pm.grantRole(await pm.PORTFOLIO_AGENT_ROLE(), account);

        strategy1 = await deploy("MockStrategy", {
            from: deployer,
            args: [assetAddress, 1],
            log: true,
            skipIfAlreadyDeployed: false
        });

        strategy2 = await deploy("MockStrategy", {
            from: deployer,
            args: [assetAddress, 2],
            log: true,
            skipIfAlreadyDeployed: false
        });

        strategy3 = await deploy("MockStrategy", {
            from: deployer,
            args: [assetAddress, 3],
            log: true,
            skipIfAlreadyDeployed: false
        });
    });



    it("remove strategy", async function () {
        await pm.addStrategy(strategy1.address);
        await pm.removeStrategy(strategy1.address);

        let weights = await pm.getAllStrategyWeights();
        expect(0).to.eq(weights.length);

        await expectRevert(pm.getStrategyWeight(strategy1.address), 'Strategy not found');

    });

    it("Revert: Address strategy not equals", async function () {
        await pm.addStrategy(strategy1.address);
        await expectRevert(pm.removeStrategy(strategy2.address), 'Address strategy not equals');
    });


    it("Revert: Target weight must be 0", async function () {
        await pm.addStrategy(strategy1.address);

        let weights = [{
            strategy: strategy1.address,
            minWeight: 0,
            targetWeight: 100000,
            maxWeight: 100000,
            riskFactor: 0,
            enabled: true,
            enabledReward: false,
        }];

        await pm.setStrategyWeights(weights);

        await expectRevert(pm.removeStrategy(strategy1.address), 'Target weight must be 0');
    });

    it("remove: first element -> shift all elements", async function () {
        await pm.addStrategy(strategy1.address);
        await pm.addStrategy(strategy2.address);
        await pm.addStrategy(strategy3.address);

        await pm.removeStrategy(strategy1.address);

        let weights = await pm.getAllStrategyWeights();
        expect(2).to.eq(weights.length);
        expect(strategy2.address).to.eq(weights[0].strategy);
        expect(strategy3.address).to.eq(weights[1].strategy);

        await expectRevert(pm.getStrategyWeight(strategy1.address), 'Strategy not found');

        let weight = await pm.getStrategyWeight(strategy2.address);
        expect(strategy2.address).to.eq(weight.strategy);

        weight = await pm.getStrategyWeight(strategy3.address);
        expect(strategy3.address).to.eq(weight.strategy);
    });

    it("remove: second element -> shift right element", async function () {
        await pm.addStrategy(strategy1.address);
        await pm.addStrategy(strategy2.address);
        await pm.addStrategy(strategy3.address);

        await pm.removeStrategy(strategy2.address);

        let weights = await pm.getAllStrategyWeights();
        expect(2).to.eq(weights.length);
        expect(strategy1.address).to.eq(weights[0].strategy);
        expect(strategy3.address).to.eq(weights[1].strategy);

        await expectRevert(pm.getStrategyWeight(strategy2.address), 'Strategy not found');

        let weight = await pm.getStrategyWeight(strategy1.address);
        expect(strategy1.address).to.eq(weight.strategy);

        weight = await pm.getStrategyWeight(strategy3.address);
        expect(strategy3.address).to.eq(weight.strategy);
    });

    it("remove: last element -> not shifts", async function () {
        await pm.addStrategy(strategy1.address);
        await pm.addStrategy(strategy2.address);
        await pm.addStrategy(strategy3.address);

        await pm.removeStrategy(strategy3.address);

        let weights = await pm.getAllStrategyWeights();
        expect(2).to.eq(weights.length);
        expect(strategy1.address).to.eq(weights[0].strategy);
        expect(strategy2.address).to.eq(weights[1].strategy);

        await expectRevert(pm.getStrategyWeight(strategy3.address), 'Strategy not found');

        let weight = await pm.getStrategyWeight(strategy1.address);
        expect(strategy1.address).to.eq(weight.strategy);

        weight = await pm.getStrategyWeight(strategy2.address);
        expect(strategy2.address).to.eq(weight.strategy);
    });

    it("add multi and remove all", async function () {
        await pm.addStrategy(strategy1.address);
        await pm.addStrategy(strategy2.address);
        await pm.addStrategy(strategy3.address);

        await pm.removeStrategy(strategy3.address);
        await pm.removeStrategy(strategy1.address);
        await pm.removeStrategy(strategy2.address);

        let weights = await pm.getAllStrategyWeights();
        expect(0).to.eq(weights.length);

        await expectRevert(pm.getStrategyWeight(strategy3.address), 'Strategy not found');
        await expectRevert(pm.getStrategyWeight(strategy2.address), 'Strategy not found');
        await expectRevert(pm.getStrategyWeight(strategy1.address), 'Strategy not found');

    });

    it("Call only onlyAdmin", async function () {
        await expectRevert(pm.connect(notAdminUser).removeStrategy(strategy1.address), 'Restricted to admins');
    });

});



describe("PortfolioManager: setStrategyWeights", function () {

    let pm;
    let strategy1;
    let strategy2;
    let account;
    let notAdminUser;

    sharedBeforeEach(async () => {
        await hre.run("compile");
        await resetHardhat(process.env.STAND);

        const {deploy} = deployments;
        const {deployer} = await getNamedAccounts();

        account = deployer;

        await deployments.fixture([]);

        notAdminUser = provider.createEmptyWallet();
        await transferETH(1, notAdminUser.address);

        pm = await deployContract("PortfolioManager");
        await pm.grantRole(await pm.PORTFOLIO_AGENT_ROLE(), account);

        strategy1 = await deploy("MockStrategy", {
            from: deployer,
            args: [assetAddress, 1],
            log: true,
            skipIfAlreadyDeployed: false
        });

        strategy2 = await deploy("MockStrategy", {
            from: deployer,
            args: [assetAddress, 2],
            log: true,
            skipIfAlreadyDeployed: false
        });

    });

    it("Success change", async function () {
        await pm.addStrategy(strategy1.address);
        await pm.addStrategy(strategy2.address);

        let weights = [
            {
                strategy: strategy1.address,
                minWeight: 0,
                targetWeight: 10000,
                maxWeight: 100000,
                riskFactor: 0,
                enabled: true,
                enabledReward: false,
            },
            {
                strategy: strategy2.address,
                minWeight: 0,
                targetWeight: 90000,
                maxWeight: 100000,
                riskFactor: 0,
                enabled: false,
                enabledReward: true,
            },
        ];

        await pm.setStrategyWeights(weights);

        let results = await pm.getAllStrategyWeights();

        let weight = results[0];
        expect(strategy1.address).to.eq(weight.strategy);
        expect(0).to.eq(weight.minWeight);
        expect(10000).to.eq(weight.targetWeight);
        expect(100000).to.eq(weight.maxWeight);
        expect(true).to.eq(weight.enabled);
        expect(false).to.eq(weight.enabledReward);

        weight = results[1];
        expect(strategy2.address).to.eq(weight.strategy);
        expect(0).to.eq(weight.minWeight);
        expect(90000).to.eq(weight.targetWeight);
        expect(100000).to.eq(weight.maxWeight);
        expect(false).to.eq(weight.enabled);
        expect(true).to.eq(weight.enabledReward);


        weights = [
            {
                strategy: strategy1.address,
                minWeight: 0,
                targetWeight: 90000,
                maxWeight: 100000,
                riskFactor: 0,
                enabled: true,
                enabledReward: true,
            },
            {
                strategy: strategy2.address,
                minWeight: 0,
                targetWeight: 10000,
                maxWeight: 100000,
                riskFactor: 0,
                enabled: false,
                enabledReward: false,
            },
        ];

        await pm.setStrategyWeights(weights);

        results = await pm.getAllStrategyWeights();

        weight = results[0];
        expect(strategy1.address).to.eq(weight.strategy);
        expect(0).to.eq(weight.minWeight);
        expect(90000).to.eq(weight.targetWeight);
        expect(100000).to.eq(weight.maxWeight);
        expect(true).to.eq(weight.enabled);
        expect(true).to.eq(weight.enabledReward);

        weight = results[1];
        expect(strategy2.address).to.eq(weight.strategy);
        expect(0).to.eq(weight.minWeight);
        expect(10000).to.eq(weight.targetWeight);
        expect(100000).to.eq(weight.maxWeight);
        expect(false).to.eq(weight.enabled);
        expect(false).to.eq(weight.enabledReward);


    });

    it("Revert: Wrong number of strategies", async function () {
        await pm.addStrategy(strategy1.address);
        await pm.addStrategy(strategy2.address);

        let weights = [
            {
                strategy: strategy1.address,
                minWeight: 0,
                targetWeight: 10000,
                maxWeight: 100000,
                riskFactor: 0,
                enabled: true,
                enabledReward: false,
            },
        ];

        await expectRevert(pm.setStrategyWeights(weights), "Wrong number of strategies");
    });

    it("Revert: Strategy was updated", async function () {
        await pm.addStrategy(strategy1.address);
        await pm.addStrategy(strategy2.address);

        let weights = [
            {
                strategy: strategy1.address,
                minWeight: 0,
                targetWeight: 10000,
                maxWeight: 100000,
                riskFactor: 0,
                enabled: true,
                enabledReward: false,
            },

            {
                strategy: strategy1.address,
                minWeight: 0,
                targetWeight: 10000,
                maxWeight: 100000,
                riskFactor: 0,
                enabled: true,
                enabledReward: false,
            },
        ];

        await expectRevert(pm.setStrategyWeights(weights), "Strategy was updated");
    });


    describe('TotalRiskFactor', function() {

        it("set 5.15%", async function () {
            await pm.addStrategy(strategy1.address);
            await pm.addStrategy(strategy2.address);

            let weights = [
                {
                    strategy: strategy1.address,
                    minWeight: 0,
                    targetWeight: 50_000,
                    maxWeight: 100_000,
                    riskFactor: 5_100,
                    enabled: true,
                    enabledReward: false,
                },

                {
                    strategy: strategy2.address,
                    minWeight: 0,
                    targetWeight: 50_000,
                    maxWeight: 100_000,
                    riskFactor: 5_200,
                    enabled: true,
                    enabledReward: false,
                },
            ];

            let tx = await (await pm.setStrategyWeights(weights)).wait();

            let event = tx.events.find((e)=>e.event === 'TotalRiskFactorUpdated');
            await expect(5_150).to.equal(Number.parseInt(event.args[0]));
            await expect(5_150).to.equal(await pm.getTotalRiskFactor());
        });

        it("set 0%", async function () {
            await pm.addStrategy(strategy1.address);
            await pm.addStrategy(strategy2.address);

            let weights = [
                {
                    strategy: strategy1.address,
                    minWeight: 0,
                    targetWeight: 50_000,
                    maxWeight: 100_000,
                    riskFactor: 0,
                    enabled: true,
                    enabledReward: false,
                },

                {
                    strategy: strategy2.address,
                    minWeight: 0,
                    targetWeight: 50_000,
                    maxWeight: 100_000,
                    riskFactor: 0,
                    enabled: true,
                    enabledReward: false,
                },
            ];

            let tx = await (await pm.setStrategyWeights(weights)).wait();

            let event = tx.events.find((e)=>e.event === 'TotalRiskFactorUpdated');
            await expect(0).to.equal(Number.parseInt(event.args[0]));
            await expect(0).to.equal(await pm.getTotalRiskFactor());
        })
    });


    it("Revert: Total target should equal to TOTAL_WEIGHT", async function () {
        await pm.addStrategy(strategy1.address);
        await pm.addStrategy(strategy2.address);

        let weights = [
            {
                strategy: strategy1.address,
                minWeight: 0,
                targetWeight: 10000,
                maxWeight: 100000,
                riskFactor: 0,
                enabled: true,
                enabledReward: false,
            },

            {
                strategy: strategy2.address,
                minWeight: 0,
                targetWeight: 10000,
                maxWeight: 100000,
                riskFactor: 0,
                enabled: true,
                enabledReward: false,
            }
        ];

        await expectRevert(pm.setStrategyWeights(weights), "Total target should equal to TOTAL_WEIGHT");

        weights = [
            {
                strategy: strategy1.address,
                minWeight: 0,
                targetWeight: 60000,
                maxWeight: 100000,
                riskFactor: 0,
                enabled: true,
                enabledReward: false,
            },

            {
                strategy: strategy2.address,
                minWeight: 0,
                targetWeight: 50000,
                maxWeight: 100000,
                riskFactor: 0,
                enabled: true,
                enabledReward: false,
            }
        ];

        await expectRevert(pm.setStrategyWeights(weights), "Total target should equal to TOTAL_WEIGHT");
    });


    it("Revert: targetWeight shouldn't higher than maxWeight", async function () {
        await pm.addStrategy(strategy1.address);

        let weights = [{
            strategy: strategy1.address,
            minWeight: 0,
            targetWeight: 100000,
            maxWeight: 20000,
            riskFactor: 0,
            enabled: true,
            enabledReward: false,
        }];

        await expectRevert(pm.setStrategyWeights(weights), "targetWeight shouldn't higher than maxWeight");
    });


    it("Revert: minWeight shouldn't higher than targetWeight", async function () {
        await pm.addStrategy(strategy1.address);

        let weights = [{
            strategy: strategy1.address,
            minWeight: 100000,
            targetWeight: 500,
            maxWeight: 0,
            riskFactor: 0,
            enabled: true,
            enabledReward: false,
        }];

        await expectRevert(pm.setStrategyWeights(weights), 'minWeight shouldn\'t higher than targetWeight');
    });

    it("Revert: Incorrect strategy index", async function () {
        await pm.addStrategy(strategy1.address);

        let weights = [{
            strategy: strategy2.address,
            minWeight: 0,
            targetWeight: 100000,
            maxWeight: 100000,
            riskFactor: 0,
            enabled: true,
            enabledReward: false,
        }];

        await expectRevert(pm.setStrategyWeights(weights), 'Incorrect strategy index');
    });


    it("Call only Portfolio Agent", async function () {
        await expectRevert(pm.connect(notAdminUser).setStrategyWeights([]), 'Restricted to Portfolio Agent');
    });

});


describe("PortfolioManager: Deposit/Withdraw", function () {

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

        await pm.grantRole(await pm.PORTFOLIO_AGENT_ROLE(), account);

        let weights = [{
            strategy: nonCashStrategy.address,
            minWeight: 0,
            targetWeight: 90000,
            maxWeight: 100000,
            riskFactor: 0,
            enabled: true,
            enabledReward: false,
        }, {
            strategy: cashStrategy.address,
            minWeight: 0,
            targetWeight: 10000,
            maxWeight: 20000,
            riskFactor: 0,
            enabled: true,
            enabledReward: false,
        }];

        await pm.addStrategy(nonCashStrategy.address);
        await pm.addStrategy(cashStrategy.address);

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
