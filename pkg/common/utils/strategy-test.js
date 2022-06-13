const hre = require("hardhat");
const {deployments, getNamedAccounts, ethers} = require("hardhat");
const {resetHardhat} = require("./tests");
const ERC20 = require("./abi/IERC20.json");
const {logStrategyGasUsage} = require("./strategyCommon");
const {toUSDC, fromUSDC} = require("./decimals");
const {expect} = require("chai");
const {evmCheckpoint, evmRestore, sharedBeforeEach} = require("./sharedBeforeEach")
const BN = require('bn.js');
const chai = require("chai");
chai.use(require('chai-bn')(BN));


function strategyTest(strategyParams, network, assets, runStrategyLogic) {

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

    describe(`${strategyParams.name}`, function () {

        stakeUnstake(strategyParams, network, assets, values, runStrategyLogic);
        unstakeFull(strategyParams, network, assets, values, runStrategyLogic);

        if (strategyParams.enabledReward) {
            claimRewards(strategyParams, network, assets, values, runStrategyLogic);
        }

        if (strategyParams.neutralStrategy) {
            healthFactorBalance(strategyParams, network, assets, values, runStrategyLogic);
        }

    });
}

function stakeUnstake(strategyParams, network, assets, values, runStrategyLogic) {

    describe(`Stake/unstake`, function () {

        let account;
        let recipient;

        let strategy;
        let usdc;
        let strategyName;

        sharedBeforeEach("deploy", async () => {
            await hre.run("compile");
            await resetHardhat(network);

            strategyName = strategyParams.name;
            await deployments.fixture([strategyName, `${strategyName}Setting`, 'test']);

            const signers = await ethers.getSigners();
            account = signers[0];
            recipient = signers[1];

            strategy = await ethers.getContract(strategyName);
            await strategy.setPortfolioManager(recipient.address);
            if (strategyParams.isRunStrategyLogic) {
                await runStrategyLogic(strategyName, strategy.address);
            }

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

                sharedBeforeEach(`stake ${stakeValue}`, async () => {

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

                    sharedBeforeEach(`unstake ${stakeValue}`, async () => {

                        let balanceUsdcBefore = new BN((await usdc.balanceOf(recipient.address)).toString());

                        expectedNetAsset = new BN((await strategy.netAssetValue()).toString()).sub(valueBN);
                        expectedLiquidation = new BN((await strategy.liquidationValue()).toString()).sub(valueBN);

                        await strategy.connect(recipient).unstake(usdc.address, toUSDC(unstakeValue), recipient.address, false);

                        let balanceUsdcAfter = new BN((await usdc.balanceOf(recipient.address)).toString());

                        balanceUsdc = balanceUsdcAfter.sub(balanceUsdcBefore);

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

                });
            });

        });

    });
}


function unstakeFull(strategyParams, network, assets, values, runStrategyLogic) {

    describe(`Stake/unstakeFull`, function () {

        let account;
        let recipient;

        let strategy;
        let usdc;
        let strategyName;

        sharedBeforeEach("deploy", async () => {
            await hre.run("compile");
            await resetHardhat(network);

            strategyName = strategyParams.name;
            await deployments.fixture([strategyName, `${strategyName}Setting`, 'test']);

            const signers = await ethers.getSigners();
            account = signers[0];
            recipient = signers[1];

            strategy = await ethers.getContract(strategyName);
            await strategy.setPortfolioManager(recipient.address);
            if (strategyParams.isRunStrategyLogic) {
                await runStrategyLogic(strategyName, strategy.address);
            }

            usdc = await ethers.getContractAt(ERC20, assets.usdc);
        });


        values.forEach(item => {

            let stakeValue = item.value;
            let deltaPercent = item.deltaPercent ? item.deltaPercent : 5;

            describe(`Stake ${stakeValue} => UnstakeFull`, function () {

                let balanceUsdcAfter;

                let liquidationValueAfterStake;

                let netAssetValueCheck;
                let liquidationValueCheck;

                let valueBN = new BN(toUSDC(stakeValue));
                let DELTA = valueBN.muln(deltaPercent).divn(100);

                sharedBeforeEach(`unstake  ${stakeValue}`, async () => {

                    await usdc.transfer(recipient.address, toUSDC(stakeValue));

                    await usdc.connect(recipient).transfer(strategy.address, toUSDC(stakeValue));
                    await strategy.connect(recipient).stake(usdc.address, toUSDC(stakeValue));

                    liquidationValueAfterStake = new BN((await strategy.liquidationValue()).toString());

                    await strategy.connect(recipient).unstake(usdc.address, 0, recipient.address, true);

                    balanceUsdcAfter = new BN((await usdc.balanceOf(recipient.address)).toString());

                    netAssetValueCheck = new BN((await strategy.netAssetValue()).toString());
                    liquidationValueCheck = new BN((await strategy.liquidationValue()).toString());

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


function claimRewards(strategyParams, network, assets, values, runStrategyLogic) {

    describe(`Stake/ClaimRewards`, function () {

        let account;
        let recipient;

        let strategy;
        let usdc;
        let strategyName;

        sharedBeforeEach(`deploy`, async () => {
            await hre.run("compile");
            await resetHardhat(network);

            strategyName = strategyParams.name;
            await deployments.fixture([strategyName, `${strategyName}Setting`, 'test']);

            const signers = await ethers.getSigners();
            account = signers[0];
            recipient = signers[1];

            strategy = await ethers.getContract(strategyName);
            await strategy.setPortfolioManager(recipient.address);
            if (strategyParams.isRunStrategyLogic) {
                await runStrategyLogic(strategyName, strategy.address);
            }

            usdc = await ethers.getContractAt(ERC20, assets.usdc);
        });

        values.forEach(item => {

            let stakeValue = item.value;

            describe(`Stake ${stakeValue} => ClaimRewards`, function () {

                let balanceUsdc;

                sharedBeforeEach(`rewards  ${stakeValue}`, async () => {

                    await usdc.transfer(recipient.address, toUSDC(stakeValue));
                    await usdc.connect(recipient).transfer(strategy.address, toUSDC(stakeValue));
                    await strategy.connect(recipient).stake(usdc.address, toUSDC(stakeValue));

                    const sevenDays = 7 * 24 * 60 * 60 * 1000;
                    await ethers.provider.send("evm_increaseTime", [sevenDays])
                    await ethers.provider.send('evm_mine');

                    if (strategyParams.doubleStakeReward) {
                        await usdc.transfer(recipient.address, toUSDC(stakeValue));
                        await usdc.connect(recipient).transfer(strategy.address, toUSDC(stakeValue));
                        await strategy.connect(recipient).stake(usdc.address, toUSDC(stakeValue));
                    }

                    await strategy.connect(recipient).claimRewards(recipient.address);

                    balanceUsdc = new BN((await usdc.balanceOf(recipient.address)).toString());

                });


                it(`Balance USDC is not 0`, async function () {
                    expect(balanceUsdc.toNumber()).to.greaterThan(0);
                });


            });

        });
    });
}

function healthFactorBalance(strategyParams, network, assets, values, runStrategyLogic) {

    describe(`HealthFactorBalance`, function () {

        let account;
        let recipient;

        let strategy;
        let usdc;
        let strategyName;

        sharedBeforeEach(`deploy`, async () => {
            await hre.run("compile");
            await resetHardhat(network);

            strategyName = strategyParams.name;
            await deployments.fixture([strategyName, `${strategyName}Setting`, 'test']);

            const signers = await ethers.getSigners();
            account = signers[0];
            recipient = signers[1];

            strategy = await ethers.getContract(strategyName);
            await strategy.setPortfolioManager(recipient.address);
            if (strategyParams.isRunStrategyLogic) {
                await runStrategyLogic(strategyName, strategy.address);
            }

            usdc = await ethers.getContractAt(ERC20, assets.usdc);
        });


        values.forEach(item => {

            let stakeValue = item.value;
            let deltaPercent = item.deltaPercent ? item.deltaPercent : 5;

            describe(`Stake ${stakeValue} => Disbalancing/Balancing`, function () {

                let desiredHealthFactor1;
                let realHealthFactor1;

                let desiredHealthFactor2;
                let realHealthFactor2;

                let desiredHealthFactor3;
                let realHealthFactor3;

                let desiredHealthFactor4;
                let realHealthFactor4;

                let balancingDelta;

                sharedBeforeEach(`stake  ${stakeValue}`, async () => {

                    await usdc.transfer(recipient.address, toUSDC(stakeValue));

                    await usdc.connect(recipient).transfer(strategy.address, toUSDC(stakeValue));
                    balancingDelta = new BN((await strategy.balancingDelta()).toString());
                    await strategy.connect(recipient).stake(usdc.address, toUSDC(stakeValue));

                    await strategy.grepRealHealthFactor();
                    desiredHealthFactor1 = new BN((await strategy.healthFactor()).toString());
                    realHealthFactor1 = new BN((await strategy.realHealthFactor()).toString());

                    desiredHealthFactor2 = desiredHealthFactor1.muln(100+1).divn(100);
                    await strategy.connect(recipient).setHealthFactor(desiredHealthFactor2.div(new BN(10).pow(new BN(15))).toString());
                    await strategy.connect(recipient).healthFactorBalance();
                    await strategy.grepRealHealthFactor();
                    realHealthFactor2 = new BN((await strategy.realHealthFactor()).toString());

                    desiredHealthFactor3 = desiredHealthFactor1.muln(100-1).divn(100);
                    await strategy.connect(recipient).setHealthFactor(desiredHealthFactor3.div(new BN(10).pow(new BN(15))).toString());
                    await strategy.connect(recipient).healthFactorBalance();
                    await strategy.grepRealHealthFactor();
                    realHealthFactor3 = new BN((await strategy.realHealthFactor()).toString());

                    desiredHealthFactor4 = desiredHealthFactor1;
                    await strategy.connect(recipient).setHealthFactor(desiredHealthFactor4.div(new BN(10).pow(new BN(15))).toString());
                    await strategy.connect(recipient).healthFactorBalance();
                    await strategy.grepRealHealthFactor();
                    realHealthFactor4 = new BN((await strategy.realHealthFactor()).toString());

                });


                it(`HealthFactor after Stake`, async function () {
                    greatLess(desiredHealthFactor1, realHealthFactor1, balancingDelta);
                });

                it(`HealthFactor after 1% increase`, async function () {
                    greatLess(desiredHealthFactor2, realHealthFactor2, balancingDelta);
                });

                it(`HealthFactor after 1% decrease`, async function () {
                    greatLess(desiredHealthFactor3, realHealthFactor3, balancingDelta);
                });

                it(`HealthFactor after return`, async function () {
                    greatLess(desiredHealthFactor4, realHealthFactor4, balancingDelta);
                });

            });

        });

    });
}

function greatLess(value, expected, delta) {

    let maxValue = expected.add(delta);
    let minValue = expected.sub(delta);

    let lte = value.lte(maxValue);
    let gte = value.gte(minValue);

    let valueNumber = value.div(new BN(10).pow(new BN(6))).toString();
    let minValueNumber = minValue.div(new BN(10).pow(new BN(6))).toString();
    let maxValueNumber = maxValue.div(new BN(10).pow(new BN(6))).toString();

    let minSub = (value.sub(minValue)).div(new BN(10).pow(new BN(6))).toString();
    let maxSub = (value.sub(maxValue)).div(new BN(10).pow(new BN(6))).toString();

    expect(gte).to.equal(true, `Value[${valueNumber}] less than Min Value[${minValueNumber}] dif:[${minSub}]`);
    expect(lte).to.equal(true, `Value[${valueNumber}] great than Max Value[${maxValueNumber}] dif:[${maxSub}]`);
}

module.exports = {
    strategyTest: strategyTest,
}
