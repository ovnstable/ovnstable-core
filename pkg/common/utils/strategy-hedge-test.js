const hre = require("hardhat");
const {deployments, getNamedAccounts, ethers} = require("hardhat");
const {resetHardhat} = require("./tests");
const ERC20 = require("./abi/IERC20.json");
const {logStrategyGasUsage} = require("./strategyCommon");
const {toE6, toE18} = require("./decimals");
const {expect} = require("chai");
const {evmCheckpoint, evmRestore, sharedBeforeEach} = require("./sharedBeforeEach")
const BN = require('bn.js');
const chai = require("chai");
chai.use(require('chai-bn')(BN));

const {waffle} = require("hardhat");
const {provider} = waffle;


function strategyTest(strategyParams, network, assetAddress, runStrategyLogic) {

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

        stakeUnstake(strategyParams, network, assetAddress, values, runStrategyLogic);
    });
}

function stakeUnstake(strategyParams, network, assetAddress, values, runStrategyLogic) {

    describe(`Stake/unstake`, function () {

        let account;
        let recipient;

        let strategy;
        let asset;
        let strategyName;

        let symbol;
        let toAsset = function() {};

        sharedBeforeEach("deploy", async () => {


            strategyName = strategyParams.name;
            await deployments.fixture([strategyName, `${strategyName}Setting`, 'BuyUsdPlus']);

            const signers = await ethers.getSigners();

            account = signers[0];
            recipient = provider.createEmptyWallet();

            strategy = await ethers.getContract(strategyName);
            await strategy.setExchanger(recipient.address);
            if (strategyParams.isRunStrategyLogic) {
                await runStrategyLogic(strategyName, strategy.address);
            }

            asset = await ethers.getContractAt("ERC20", assetAddress);
            symbol = await asset.symbol();
            let decimals = await asset.decimals();
            if (decimals === 18) {
                toAsset = toE18;
            } else {
                toAsset = toE6;
            }

        });

        it("log gas", async () => {
            await logStrategyGasUsage(strategyName, strategy, asset, account.address)
        });


        values.forEach(item => {

            let stakeValue = item.value;
            let deltaPercent = item.deltaPercent ? item.deltaPercent : 5;


            let unstakeValue = stakeValue / 2;

            describe(`Stake ${stakeValue}`, function () {

                let balanceAsset;
                let expectedNetAsset;
                let expectedLiquidation;

                let valueBN = new BN(toAsset(stakeValue));
                let DELTA = valueBN.muln(deltaPercent).divn(100);

                let netAssetValueCheck;
                let liquidationValueCheck;

                sharedBeforeEach(`stake ${stakeValue}`, async () => {

                    await asset.transfer(recipient.address, toAsset(stakeValue));

                    let balanceAssetBefore = new BN((await asset.balanceOf(recipient.address)).toString());

                    expectedNetAsset = new BN((await strategy.netAssetValue()).toString()).add(valueBN);
                    expectedLiquidation = new BN((await strategy.liquidationValue()).toString()).add(valueBN);

                    await asset.connect(recipient).transfer(strategy.address, toAsset(stakeValue));
                    await strategy.connect(recipient).stake(asset.address, toAsset(stakeValue));

                    let balanceAssetAfter = new BN((await asset.balanceOf(recipient.address)).toString());

                    balanceAsset = balanceAssetBefore.sub(balanceAssetAfter);

                    netAssetValueCheck = new BN((await strategy.netAssetValue()).toString());
                    liquidationValueCheck = new BN((await strategy.liquidationValue()).toString());

                });

                it(`Balance ${symbol} is in range`, async function () {
                    greatLess(balanceAsset, valueBN, DELTA);
                });

                it(`NetAssetValue ${symbol} is in range`, async function () {
                    greatLess(netAssetValueCheck, expectedNetAsset, DELTA);
                });

                it(`LiquidationValue ${symbol} is in range`, async function () {
                    greatLess(liquidationValueCheck, expectedLiquidation, DELTA);
                });


                describe(`UnStake ${unstakeValue}`, function () {

                    let balanceAsset;
                    let expectedNetAsset;
                    let expectedLiquidation;

                    let valueBN = new BN(toAsset(unstakeValue));
                    let DELTA = valueBN.muln(deltaPercent).divn(100); // 5%

                    let netAssetValueCheck;
                    let liquidationValueCheck;

                    sharedBeforeEach(`unstake ${stakeValue}`, async () => {

                        let balanceAssetBefore = new BN((await asset.balanceOf(recipient.address)).toString());

                        expectedNetAsset = new BN((await strategy.netAssetValue()).toString()).sub(valueBN);
                        expectedLiquidation = new BN((await strategy.liquidationValue()).toString()).sub(valueBN);

                        await strategy.connect(recipient).unstake(asset.address, toAsset(unstakeValue), recipient.address, false);

                        let balanceAssetAfter = new BN((await asset.balanceOf(recipient.address)).toString());

                        balanceAsset = balanceAssetAfter.sub(balanceAssetBefore);

                        netAssetValueCheck = new BN((await strategy.netAssetValue()).toString());
                        liquidationValueCheck = new BN((await strategy.liquidationValue()).toString());

                    });

                    it(`Balance ${symbol} is in range`, async function () {
                        greatLess(balanceAsset, valueBN, DELTA);
                    });

                    it(`NetAssetValue ${symbol} is in range`, async function () {
                        greatLess(netAssetValueCheck, expectedNetAsset, DELTA);
                    });

                    it(`LiquidationValue ${symbol} is in range`, async function () {
                        greatLess(liquidationValueCheck, expectedLiquidation, DELTA);
                    });

                });
            });

        });

    });
}


function claimRewards(strategyParams, network, assetAddress, values, runStrategyLogic) {

    describe(`Stake/ClaimRewards`, function () {

        let account;
        let recipient;

        let strategy;
        let asset;
        let strategyName;

        let symbol;
        let toAsset = function() {};

        sharedBeforeEach(`deploy`, async () => {
            await hre.run("compile");
            await resetHardhat(network);

            strategyName = strategyParams.name;
            await deployments.fixture([strategyName, `${strategyName}Setting`, 'BuyUsdPlus']);

            const signers = await ethers.getSigners();
            account = signers[0];
            recipient = signers[1];

            strategy = await ethers.getContract(strategyName);
            await strategy.setPortfolioManager(recipient.address);
            if (strategyParams.isRunStrategyLogic) {
                await runStrategyLogic(strategyName, strategy.address);
            }

            asset = await ethers.getContractAt("ERC20", assetAddress);
            symbol = await asset.symbol();
            let decimals = await asset.decimals();
            if (decimals === 18) {
                toAsset = toE18;
            } else {
                toAsset = toE6;
            }
        });

        values.forEach(item => {

            let stakeValue = item.value;

            describe(`Stake ${stakeValue} => ClaimRewards`, function () {

                let balanceAsset;

                sharedBeforeEach(`rewards  ${stakeValue}`, async () => {

                    await asset.transfer(recipient.address, toAsset(stakeValue));
                    await asset.connect(recipient).transfer(strategy.address, toAsset(stakeValue));
                    await strategy.connect(recipient).stake(asset.address, toAsset(stakeValue));

                    const sevenDays = 7 * 24 * 60 * 60 * 1000;
                    await ethers.provider.send("evm_increaseTime", [sevenDays])
                    await ethers.provider.send('evm_mine');

                    if (strategyParams.doubleStakeReward) {
                        await asset.transfer(recipient.address, toAsset(stakeValue));
                        await asset.connect(recipient).transfer(strategy.address, toAsset(stakeValue));
                        await strategy.connect(recipient).stake(asset.address, toAsset(stakeValue));
                    }

                    await strategy.connect(recipient).claimRewards(recipient.address);

                    balanceAsset = new BN((await asset.balanceOf(recipient.address)).toString());

                });


                it(`Balance ${symbol} is not 0`, async function () {
                    expect(balanceAsset.toNumber()).to.greaterThan(0);
                });


            });

        });
    });
}

function healthFactorBalance(strategyParams, network, assetAddress, values, runStrategyLogic) {

    describe(`HealthFactorBalance`, function () {

        let account;
        let recipient;

        let strategy;
        let asset;
        let strategyName;

        let symbol;
        let toAsset = function() {};

        sharedBeforeEach(`deploy`, async () => {
            await hre.run("compile");
            await resetHardhat(network);

            strategyName = strategyParams.name;
            await deployments.fixture([strategyName, `${strategyName}Setting`, 'BuyUsdPlus']);

            const signers = await ethers.getSigners();
            account = signers[0];
            recipient = signers[1];

            strategy = await ethers.getContract(strategyName);
            await strategy.setPortfolioManager(recipient.address);
            if (strategyParams.isRunStrategyLogic) {
                await runStrategyLogic(strategyName, strategy.address);
            }

            asset = await ethers.getContractAt("ERC20", assetAddress);
            symbol = await asset.symbol();
            let decimals = await asset.decimals();
            if (decimals === 18) {
                toAsset = toE18;
            } else {
                toAsset = toE6;
            }
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

                    await asset.transfer(recipient.address, toAsset(stakeValue));

                    await asset.connect(recipient).transfer(strategy.address, toAsset(stakeValue));
                    balancingDelta = new BN((await strategy.balancingDelta()).toString());
                    await strategy.connect(recipient).stake(asset.address, toAsset(stakeValue));

                    await strategy.grepRealHealthFactor();
                    desiredHealthFactor1 = new BN((await strategy.healthFactor()).toString());
                    realHealthFactor1 = new BN((await strategy.realHealthFactor()).toString());

                    desiredHealthFactor2 = desiredHealthFactor1.muln(100 + 1).divn(100).div(new BN(10).pow(new BN(15))).mul(new BN(10).pow(new BN(15)));
                    await strategy.connect(recipient).setHealthFactor(desiredHealthFactor2.div(new BN(10).pow(new BN(15))).toString());
                    await strategy.connect(recipient).healthFactorBalance();
                    await strategy.grepRealHealthFactor();
                    realHealthFactor2 = new BN((await strategy.realHealthFactor()).toString());

                    desiredHealthFactor3 = desiredHealthFactor1.muln(100 - 1).divn(100).div(new BN(10).pow(new BN(15))).mul(new BN(10).pow(new BN(15)));
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
