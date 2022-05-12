const hre = require("hardhat");
const {deployments, getNamedAccounts, ethers} = require("hardhat");
const {resetHardhat} = require("./tests");
const ERC20 = require("./abi/IERC20.json");
const {logStrategyGasUsage} = require("./strategyCommon");
const {toUSDC, fromUSDC} = require("./decimals");
const {expect} = require("chai");
const {evmCheckpoint, evmRestore} = require("./sharedBeforeEach")
const BN = require('bn.js');
const chai = require("chai");
chai.use(require('chai-bn')(BN));
const IController = require("./abi/tetu/IController.json");


function strategyTest(strategy, network, assets) {

    let values = [
        {
            value: 0.002,
            deltaPercent: 50,
        },
        {
            value: 0.02,
            deltaPercent: 10,
        },
        {
            value: 0.2,
            deltaPercent: 5,
        },
        {
            value: 2,
            deltaPercent: 5,
        },
        {
            value: 20,
            deltaPercent: 1,
        },
        {
            value: 200,
            deltaPercent: 1,
        },
        {
            value: 2000,
            deltaPercent: 1,
        },
        {
            value: 20000,
            deltaPercent: 1,
        },
        {
            value: 200000,
            deltaPercent: 0.1,
        },
        {
            value: 2000000,
            deltaPercent: 0.1,
        },
    ]

    describe(`${strategy.name}`, function () {

        stakeUnstake(strategy.name, network, assets, values);
        unstakeFull(strategy.name, network, assets, values);

        if (strategy.enabledReward) {
            claimRewards(strategy.name, network, assets, values);
        }

    });
}

function stakeUnstake(strategyName, network, assets, values) {

    describe(`Stake/unstake`, function () {

        let account;
        let recipient;

        let strategy;
        let usdc;

        before(async () => {
            await hre.run("compile");
            await resetHardhat(network);

            await deployments.fixture([strategyName, `${strategyName}Setting`, 'test']);

            const signers = await ethers.getSigners();
            account = signers[0];
            recipient = signers[1];

            strategy = await ethers.getContract(strategyName);
            await strategy.setPortfolioManager(recipient.address);
            await runStrategyLogic(strategyName, strategy.address);

            usdc = await ethers.getContractAt(ERC20, assets.usdc);
        });

        it("log gas", async () => {
            await logStrategyGasUsage(strategyName, strategy, usdc, account.address)
        });


        values.forEach(item => {

            let stakeValue = item.value;
            let deltaPercent = item.deltaPercent ? item.deltaPercent : 5;


            let unstakeValue = stakeValue / 2;

            describe(`Stake ${stakeValue}`, function () {

                let balanceUsdc;
                let expectedNetAsset;
                let expectedLiquidation;

                let valueBN = new BN(toUSDC(stakeValue));
                let DELTA = valueBN.muln(deltaPercent).divn(100);

                let netAssetValueCheck;
                let liquidationValueCheck;

                before(async () => {

                    await evmCheckpoint("default");


                    await usdc.transfer(recipient.address, toUSDC(stakeValue));

                    let balanceUsdcBefore = new BN((await usdc.balanceOf(recipient.address)).toString());

                    expectedNetAsset = new BN((await strategy.netAssetValue()).toString()).add(valueBN);
                    expectedLiquidation = new BN((await strategy.liquidationValue()).toString()).add(valueBN);

                    await usdc.connect(recipient).transfer(strategy.address, toUSDC(stakeValue));
                    await strategy.connect(recipient).stake(usdc.address, toUSDC(stakeValue));

                    let balanceUsdcAfter = new BN((await usdc.balanceOf(recipient.address)).toString());

                    balanceUsdc = balanceUsdcBefore.sub(balanceUsdcAfter);

                    netAssetValueCheck = new BN((await strategy.netAssetValue()).toString());
                    liquidationValueCheck = new BN((await strategy.liquidationValue()).toString());

                });

                it(`Balance USDC is in range`, async function () {
                    greatLess(balanceUsdc, valueBN, DELTA);
                });

                it(`NetAssetValue USDC is in range`, async function () {
                    greatLess(netAssetValueCheck, expectedNetAsset, DELTA);
                });

                it(`LiquidationValue USDC is in range`, async function () {
                    greatLess(liquidationValueCheck, expectedLiquidation, DELTA);
                });


                describe(`UnStake ${unstakeValue}`, function () {

                    let balanceUsdc;
                    let expectedNetAsset;
                    let expectedLiquidation;

                    let valueBN = new BN(toUSDC(unstakeValue));
                    let DELTA = valueBN.muln(deltaPercent).divn(100); // 5%

                    let netAssetValueCheck;
                    let liquidationValueCheck;

                    before(async () => {

                        let balanceUsdcBefore = new BN((await usdc.balanceOf(recipient.address)).toString());

                        expectedNetAsset = new BN((await strategy.netAssetValue()).toString()).sub(valueBN);
                        expectedLiquidation = new BN((await strategy.liquidationValue()).toString()).sub(valueBN);

                        await strategy.connect(recipient).unstake(usdc.address, toUSDC(unstakeValue), recipient.address, false);

                        let balanceUsdcAfter = new BN((await usdc.balanceOf(recipient.address)).toString());

                        balanceUsdc = balanceUsdcAfter.sub(balanceUsdcBefore);

                        netAssetValueCheck = new BN((await strategy.netAssetValue()).toString());
                        liquidationValueCheck = new BN((await strategy.liquidationValue()).toString());


                        await evmRestore("default");
                    });

                    it(`Balance USDC is in range`, async function () {
                        greatLess(balanceUsdc, valueBN, DELTA);
                    });

                    it(`NetAssetValue USDC is in range`, async function () {
                        greatLess(netAssetValueCheck, expectedNetAsset, DELTA);
                    });

                    it(`LiquidationValue USDC is in range`, async function () {
                        greatLess(liquidationValueCheck, expectedLiquidation, DELTA);
                    });

                });
            });

        });

    });
}


function unstakeFull(strategyName, network, assets, values) {

    describe(`Stake/unstakeFull`, function () {

        let account;
        let recipient;

        let strategy;
        let usdc;

        before(async () => {
            await hre.run("compile");
            await resetHardhat(network);

            await deployments.fixture([strategyName, `${strategyName}Setting`, 'test']);

            const signers = await ethers.getSigners();
            account = signers[0];
            recipient = signers[1];

            strategy = await ethers.getContract(strategyName);
            await strategy.setPortfolioManager(recipient.address);
            await runStrategyLogic(strategyName, strategy.address);

            usdc = await ethers.getContractAt(ERC20, assets.usdc);
        });


        values.forEach(item => {

            let stakeValue = item.value;

            describe(`Stake ${stakeValue} => UnstakeFull`, function () {

                let balanceUsdcAfter;

                let liquidationValueAfterStake;

                let netAssetValueCheck;
                let liquidationValueCheck;

                let valueBN = new BN(toUSDC(stakeValue));
                let DELTA = valueBN.div(new BN(1000));

                before(async () => {

                    await evmCheckpoint("default");

                    await usdc.transfer(recipient.address, toUSDC(stakeValue));

                    await usdc.connect(recipient).transfer(strategy.address, toUSDC(stakeValue));
                    await strategy.connect(recipient).stake(usdc.address, toUSDC(stakeValue));

                    liquidationValueAfterStake = new BN((await strategy.liquidationValue()).toString());

                    await strategy.connect(recipient).unstake(usdc.address, 0, recipient.address, true);

                    balanceUsdcAfter = new BN((await usdc.balanceOf(recipient.address)).toString());

                    netAssetValueCheck = new BN((await strategy.netAssetValue()).toString());
                    liquidationValueCheck = new BN((await strategy.liquidationValue()).toString());

                    await evmRestore("default");

                });


                it(`Balance USDC = liquidation value`, async function () {
                    greatLess(balanceUsdcAfter, liquidationValueAfterStake, DELTA);
                });

                it(`NetAssetValue USDC is 0`, async function () {
                    expect(netAssetValueCheck.toString()).to.equal('0');
                });

                it(`LiquidationValue USDC 0`, async function () {
                    expect(liquidationValueCheck.toString()).to.equal('0');

                });


            });

        });

    });
}


function claimRewards(strategyName, network, assets, values) {

    describe(`Stake/ClaimRewards`, function () {

        let account;
        let recipient;

        let strategy;
        let usdc;

        before(async () => {
            await hre.run("compile");
            await resetHardhat(network);

            await deployments.fixture([strategyName, `${strategyName}Setting`, 'test']);

            const signers = await ethers.getSigners();
            account = signers[0];
            recipient = signers[1];

            strategy = await ethers.getContract(strategyName);
            await strategy.setPortfolioManager(recipient.address);
            await runStrategyLogic(strategyName, strategy.address);

            usdc = await ethers.getContractAt(ERC20, assets.usdc);
        });

        values.forEach(item => {

            let stakeValue = item.value;

            describe(`Stake ${stakeValue} => ClaimRewards`, function () {

                let balanceUsdc;

                before(async () => {

                    await evmCheckpoint("default");

                    await usdc.transfer(recipient.address, toUSDC(stakeValue));

                    await usdc.connect(recipient).transfer(strategy.address, toUSDC(stakeValue));
                    await strategy.connect(recipient).stake(usdc.address, toUSDC(stakeValue));

                    const sevenDays = 7 * 24 * 60 * 60 * 1000;
                    await ethers.provider.send("evm_increaseTime", [sevenDays])
                    await ethers.provider.send('evm_mine');

                    await strategy.connect(recipient).claimRewards(recipient.address);

                    balanceUsdc = new BN((await usdc.balanceOf(recipient.address)).toString());

                    await evmRestore("default");
                });


                it(`Balance USDC is not 0`, async function () {
                    expect(balanceUsdc.toNumber()).to.greaterThan(0);
                });


            });

        });
    });
}

async function runStrategyLogic(strategyName, strategyAddress) {

    if (strategyName == 'StrategyTetuUsdc') {
        let governanceAddress = "0xcc16d636dD05b52FF1D8B9CE09B09BC62b11412B";
        await hre.network.provider.request({
            method: "hardhat_impersonateAccount",
            params: [governanceAddress],
        });
        const governance = await ethers.getSigner(governanceAddress);
        let controller = await ethers.getContractAt(IController, "0x6678814c273d5088114B6E40cC49C8DB04F9bC29");
        let isWhiteList = await controller.connect(governance).whiteList(strategyAddress);
        console.log("isWhiteList before: " + isWhiteList);
        await controller.connect(governance).changeWhiteListStatus([strategyAddress], true);
        isWhiteList = await controller.connect(governance).whiteList(strategyAddress);
        console.log("isWhiteList after: " + isWhiteList);
        await hre.network.provider.request({
            method: "hardhat_stopImpersonatingAccount",
            params: [governanceAddress],
        });
    }
}

function greatLess(value, expected, delta) {

    let maxValue = expected.add(delta);
    let minValue = expected.sub(delta);

    let lte = value.lte(maxValue);
    let gte = value.gte(minValue);

    expect(gte).to.equal(true, `Value[${value.toString()}] less than Min Value[${minValue.toString()}] dif:[${value.sub(minValue).toString()}]`);
    expect(lte).to.equal(true, `Value[${value.toString()}] great than Max Value[${maxValue.toString()}] dif:[${value.sub(maxValue).toString()}]`);
}

module.exports = {
    strategyTest: strategyTest,
}