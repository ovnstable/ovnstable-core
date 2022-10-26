const hre = require("hardhat");
const {deployments, getNamedAccounts, ethers} = require("hardhat");
const {resetHardhat, greatLess} = require("./tests");
const ERC20 = require("./abi/IERC20.json");
const {logStrategyGasUsage} = require("./strategyCommon");
const {toE6, toE18, fromAsset} = require("./decimals");
const {expect} = require("chai");
const {evmCheckpoint, evmRestore, sharedBeforeEach} = require("./sharedBeforeEach");
const BigNumber = require('bignumber.js');
const chai = require("chai");
const {transferDAI, getERC20, transferETH, initWallet} = require("./script-utils");
chai.use(require('chai-bignumber')());


hre.ovn = {
    setting: true,
    noDeploy: false
}

function strategyTest(strategyParams, network, assetName, runStrategyLogic) {

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
            value: 100000,
            deltaPercent: 0.1,
        },
        {
            value: 200000,
            deltaPercent: 0.1,
        },
        {
            value: 1000000,
            deltaPercent: 0.1,
        },
        {
            value: 2000000,
            deltaPercent: 0.1,
        },
    ]

    describe(`${strategyParams.name}`, function () {

        stakeUnstake(strategyParams, network, assetName, values, runStrategyLogic);

        unstakeFull(strategyParams, network, assetName, values, runStrategyLogic);
/*
        if (strategyParams.enabledReward) {
            claimRewards(strategyParams, network, assetName, values, runStrategyLogic);
        }
*/
    });
}

function stakeUnstake(strategyParams, network, assetName, values, runStrategyLogic) {

    describe(`Stake/unstake`, function () {

        let recipient;

        let strategy;

        let asset;
        let toAsset = function() {};

        sharedBeforeEach("deploy", async () => {

            let values = await setUp(network, strategyParams, assetName, runStrategyLogic);

            recipient = values.recipient;
            strategy = values.strategy;
            asset = values.asset;
            toAsset = values.toAsset;
        });



        values.forEach(item => {

            let stakeValue = item.value;
            let deltaPercent = item.deltaPercent ? item.deltaPercent : 5;

            let unstakePercent = strategyParams.unstakePercent ? strategyParams.unstakePercent : 50;
            let unstakeValue = stakeValue * unstakePercent / 100;

            describe(`Stake ${stakeValue}`, function () {

                let balanceAsset;
                let expectedNetAsset;
                let expectedLiquidation;

                let VALUE;
                let DELTA;

                let netAssetValueCheck;
                let liquidationValueCheck;

                sharedBeforeEach(`Stake ${stakeValue}`, async () => {

                    let assetValue = toAsset(stakeValue);
                    VALUE = new BigNumber(assetValue);
                    DELTA = VALUE.times(new BigNumber(deltaPercent)).div(100);

                    await asset.transfer(recipient.address, assetValue);

                    let balanceAssetBefore = new BigNumber((await asset.balanceOf(recipient.address)).toString());

                    expectedNetAsset = new BigNumber((await strategy.netAssetValue()).toString()).plus(VALUE);
                    expectedLiquidation = new BigNumber((await strategy.liquidationValue()).toString()).plus(VALUE);

                    let amount = toAsset(stakeValue / 2);
                    await asset.connect(recipient).transfer(strategy.address, amount);
                    await strategy.connect(recipient).stake(asset.address, amount);

                    await asset.connect(recipient).transfer(strategy.address, amount);
                    await strategy.connect(recipient).stake(asset.address, amount);

                    let balanceAssetAfter = new BigNumber((await asset.balanceOf(recipient.address)).toString());

                    balanceAsset = balanceAssetBefore.minus(balanceAssetAfter);

                    netAssetValueCheck = new BigNumber((await strategy.netAssetValue()).toString());
                    liquidationValueCheck = new BigNumber((await strategy.liquidationValue()).toString());


                    let items = [
                        ...createCheck('stake', 'balance', assetValue, balanceAsset, VALUE, DELTA),
                        ...createCheck('stake', 'netAssetValue', assetValue, netAssetValueCheck, expectedNetAsset, DELTA),
                        ...createCheck('stake', 'liquidationValue', assetValue, liquidationValueCheck, expectedLiquidation, DELTA),
                    ]

                    console.table(items);

                });

                it(`Balance asset is in range`, async function () {
                    greatLess(balanceAsset, VALUE, DELTA);
                });

                it(`NetAssetValue asset is in range`, async function () {
                    greatLess(netAssetValueCheck, expectedNetAsset, DELTA);
                });

                it(`LiquidationValue asset is in range`, async function () {
                    greatLess(liquidationValueCheck, expectedLiquidation, DELTA);
                });


                describe(`UnStake ${unstakeValue}`, function () {

                    let balanceAsset;
                    let expectedNetAsset;
                    let expectedLiquidation;

                    let VALUE;
                    let DELTA;

                    let netAssetValueCheck;
                    let liquidationValueCheck;

                    sharedBeforeEach(`Unstake ${unstakeValue}`, async () => {

                        let assetValue = toAsset(unstakeValue);
                        VALUE = new BigNumber(assetValue);
                        DELTA = VALUE.times(new BigNumber(deltaPercent)).div(100);

                        if (strategyParams.unstakeDelay) {
                            let delay = strategyParams.unstakeDelay;
                            await ethers.provider.send("evm_increaseTime", [delay]);
                            await ethers.provider.send('evm_mine');
                        }

                        let balanceAssetBefore = new BigNumber((await asset.balanceOf(recipient.address)).toString());

                        expectedNetAsset = new BigNumber((await strategy.netAssetValue()).toString()).minus(VALUE);
                        expectedLiquidation = new BigNumber((await strategy.liquidationValue()).toString()).minus(VALUE);

                        await strategy.connect(recipient).unstake(asset.address, assetValue, recipient.address, false);

                        let balanceAssetAfter = new BigNumber((await asset.balanceOf(recipient.address)).toString());

                        balanceAsset = balanceAssetAfter.minus(balanceAssetBefore);

                        netAssetValueCheck = new BigNumber((await strategy.netAssetValue()).toString());
                        liquidationValueCheck = new BigNumber((await strategy.liquidationValue()).toString());


                        let items = [
                            ...createCheck('unstake', 'balance', assetValue, balanceAsset, VALUE, DELTA),
                            ...createCheck('unstake', 'netAssetValue', assetValue, netAssetValueCheck, expectedNetAsset, DELTA),
                            ...createCheck('unstake', 'liquidationValue', assetValue, liquidationValueCheck, expectedLiquidation, DELTA),
                        ]

                        console.table(items);
                    });

                    it(`Balance asset after unstake >= unstakeValue`, async function () {
                        expect(balanceAsset.gte(VALUE)).to.equal(true);
                    });

                    it(`Balance asset is in range`, async function () {
                        greatLess(balanceAsset, VALUE, DELTA);
                    });

                    it(`NetAssetValue asset is in range`, async function () {
                        greatLess(netAssetValueCheck, expectedNetAsset, DELTA);
                    });

                    it(`LiquidationValue asset is in range`, async function () {
                        greatLess(liquidationValueCheck, expectedLiquidation, DELTA);
                    });

                });
            });

        });

    });
}


function unstakeFull(strategyParams, network, assetName, values, runStrategyLogic) {

    describe(`Stake/unstakeFull`, function () {

        let recipient;

        let strategy;

        let asset;
        let toAsset = function() {};

        sharedBeforeEach("deploy", async () => {
            let values = await setUp(network, strategyParams, assetName, runStrategyLogic);

            recipient = values.recipient;
            strategy = values.strategy;
            asset = values.asset;
            toAsset = values.toAsset
        });


        values.forEach(item => {

            let stakeValue = item.value;
            let deltaPercent = item.deltaPercent ? item.deltaPercent : 5;

            describe(`Stake ${stakeValue} => UnstakeFull`, function () {

                let balanceAssetAfter;

                let liquidationValueAfterStake;

                let netAssetValueCheck;
                let liquidationValueCheck;

                let VALUE;
                let DELTA;

                sharedBeforeEach(`Unstake ${stakeValue}`, async () => {

                    let assetValue = toAsset(stakeValue);
                    VALUE = new BigNumber(assetValue);
                    DELTA = VALUE.times(new BigNumber(deltaPercent)).div(100);

                    await asset.transfer(recipient.address, assetValue);

                    await asset.connect(recipient).transfer(strategy.address, assetValue);
                    await strategy.connect(recipient).stake(asset.address, assetValue);

                    if (strategyParams.unstakeDelay) {
                        let delay = strategyParams.unstakeDelay;
                        await ethers.provider.send("evm_increaseTime", [delay]);
                        await ethers.provider.send('evm_mine');
                    }


                    liquidationValueAfterStake = new BigNumber((await strategy.liquidationValue()).toString());

                    let tx = await (await strategy.connect(recipient).unstake(asset.address, 0, recipient.address, true)).wait();
                    let rewardEvent = tx.events.find((e)=>e.event === 'Reward');
                    let rewardAmount = new BigNumber('0');
                    if (rewardEvent){
                        rewardAmount = new BigNumber(rewardEvent.args.amount.toString());
                    }

                    // UnstakeFull call claimRewards and getting value may distort the result => Remove the sum of the received rewards
                    balanceAssetAfter = (new BigNumber((await asset.balanceOf(recipient.address)).toString())).minus(rewardAmount);

                    netAssetValueCheck = new BigNumber((await strategy.netAssetValue()).toString());
                    liquidationValueCheck = new BigNumber((await strategy.liquidationValue()).toString());

                });

                it(`Balance asset after unstakeFull >= stake value minus 4 bp`, async function () {
                    expect(balanceAssetAfter.gte(VALUE.times(9996).div(10000))).to.equal(true);
                });

                it(`Balance asset = liquidation value`, async function () {
                    greatLess(balanceAssetAfter, liquidationValueAfterStake, DELTA);
                });

                it(`NetAssetValue asset is 0`, async function () {
                    expect(netAssetValueCheck.toFixed()).to.equal('0');
                });

                it(`LiquidationValue asset is 0`, async function () {
                    expect(liquidationValueCheck.toFixed()).to.equal('0');

                });

            });

        });

    });

}


function claimRewards(strategyParams, network, assetName, values, runStrategyLogic) {

    let balances = [];

    describe(`Stake/ClaimRewards`, function () {

        let recipient;

        let strategy;

        let asset;
        let toAsset = function() {};

        sharedBeforeEach(`deploy`, async () => {
            let values = await setUp(network, strategyParams, assetName, runStrategyLogic);

            recipient = values.recipient;
            strategy = values.strategy;
            asset = values.asset;
            toAsset = values.toAsset
        });

        values.forEach(item => {

            let stakeValue = item.value;

            describe(`Stake ${stakeValue} => ClaimRewards`, function () {

                let balanceAsset;

                sharedBeforeEach(`rewards ${stakeValue}`, async () => {

                    let assetValue = toAsset(stakeValue);

                    await asset.transfer(recipient.address, assetValue);
                    await asset.connect(recipient).transfer(strategy.address, assetValue);
                    await strategy.connect(recipient).stake(asset.address, assetValue);

                    let delay;
                    if (strategyParams.delay) {
                        delay = strategyParams.delay;
                    } else {
                        delay = 7 * 24 * 60 * 60 * 1000;
                    }
                    await ethers.provider.send("evm_increaseTime", [delay]);
                    await ethers.provider.send('evm_mine');

                    if (strategyParams.doubleStakeReward) {
                        await asset.transfer(recipient.address, assetValue);
                        await asset.connect(recipient).transfer(strategy.address, assetValue);
                        await strategy.connect(recipient).stake(asset.address, assetValue);
                    }

                    await strategy.connect(recipient).claimRewards(recipient.address);

                    balanceAsset = new BigNumber((await asset.balanceOf(recipient.address)).toString());
                    balances.push(balanceAsset.toString());

                });

                it(`Balance asset > 0`, async function () {
                    expect(balanceAsset.toNumber()).to.greaterThan(0);
                });

            });

        });

    });

    if (strategyParams.doubleFarm) {

        describe(`Double Stake/ClaimRewards`, function () {

            let recipient;

            let strategy;

            let asset;
            let toAsset = function() {};

            let i = 0;

            sharedBeforeEach(`deploy`, async () => {
                let values = await setUp(network, strategyParams, assetName, runStrategyLogic);

                recipient = values.recipient;
                strategy = values.strategy;
                asset = values.asset;
                toAsset = values.toAsset
            });

            values.forEach(item => {

                let stakeValue = item.value;

                describe(`Stake ${stakeValue} => ClaimRewards`, function () {

                    let balanceAsset;
                    let balanceAssetDoubleFarm;

                    sharedBeforeEach(`rewards ${stakeValue}`, async () => {

                        let assetValue = toAsset(stakeValue);
                        let totalStaked = assetValue;

                        await asset.transfer(recipient.address, assetValue);
                        await asset.connect(recipient).transfer(strategy.address, assetValue);
                        await strategy.connect(recipient).stake(asset.address, assetValue);

                        if (strategyParams.doubleStakeReward) {
                            await asset.transfer(recipient.address, assetValue);
                            await asset.connect(recipient).transfer(strategy.address, assetValue);
                            await strategy.connect(recipient).stake(asset.address, assetValue);
                            totalStaked += assetValue;
                        }

                        await asset.transfer(recipient.address, totalStaked);
                        await asset.connect(recipient).transfer(strategy.address, totalStaked);
                        await strategy.connect(recipient).stake(asset.address, totalStaked);

                        let delay;
                        if (strategyParams.delay) {
                            delay = strategyParams.delay;
                        } else {
                            delay = 7 * 24 * 60 * 60 * 1000;
                        }
                        await ethers.provider.send("evm_increaseTime", [delay]);
                        await ethers.provider.send('evm_mine');

                        await strategy.connect(recipient).claimRewards(recipient.address);

                        balanceAssetDoubleFarm = new BigNumber((await asset.balanceOf(recipient.address)).toString());
                        balanceAsset = new BigNumber(balances[i]);
                        i++;

                    });

                    it(`Balance asset after double farm 1.2 times greater than balance asset after single farm`, async function () {
                        if (balanceAssetDoubleFarm > 0) {
                            expect(balanceAssetDoubleFarm.toNumber()).to.greaterThan(balanceAsset.times(new BigNumber(1.2)).toNumber());
                        }
                    });

                });

            });

        });
    }
}

async function setUp(network, strategyParams, assetName, runStrategyLogic){

    await hre.run("compile");
    await resetHardhat(network);

    hre.ovn.tags = strategyParams.name;
    hre.ovn.setting = true;

    let strategyName = strategyParams.name;
    await deployments.fixture([strategyName, `${strategyName}Setting`, 'test']);

    const signers = await ethers.getSigners();
    const account = signers[0];
    const recipient = signers[1];

    const strategy = await ethers.getContract(strategyName);
    await strategy.setPortfolioManager(recipient.address);
    if (strategyParams.isRunStrategyLogic) {
        await runStrategyLogic(strategyName, strategy.address);
    }

    let mainAddress = (await initWallet()).address;
    // Get amount asset for test
    await getAssetAmount(mainAddress, assetName, account);

    await transferETH(100, mainAddress);

    const asset = await getERC20(assetName);

    console.log(`Balance [${assetName}]: [${fromAsset(await asset.balanceOf(mainAddress))}]`);

    let decimals = await asset.decimals();

    let toAsset;
    if (decimals === 18) {
        toAsset = toE18;
    } else {
        toAsset = toE6;
    }

    return {
        recipient: recipient,
        asset: asset,
        strategy: strategy,
        toAsset: toAsset,
    }
}

async function getAssetAmount(to, assetName, ganacheWallet) {
    if (assetName === 'dai') {
        await transferDAI(to);
    } else {
        let asset = await getERC20(assetName, ganacheWallet);
        let amount = await asset.balanceOf(ganacheWallet.address);
        await asset.transfer(to, amount);
    }
}

function createCheck(type, name , assetValue, currentValue, expectedValue, DELTA){

    let maxValue = expectedValue.plus(DELTA);
    let minValue = expectedValue.minus(DELTA);

    let min = {
        type: type,
        name: `${name}:min`,
        input: fromAsset(assetValue.toString()),
        current: fromAsset(currentValue.toString()),
        expected: fromAsset(minValue.toString()),
        difference: fromAsset(currentValue.minus(minValue).toString()),
        delta: fromAsset(DELTA.toString()),
        status: currentValue.gte(minValue) ? '✔': '✘'
    }

    let max = {
        type: type,
        name: `${name}:max`,
        input: fromAsset(assetValue.toString()),
        current: fromAsset(currentValue.toString()),
        expected: fromAsset(maxValue.toString()),
        difference: fromAsset(maxValue.minus(currentValue).toString()),
        delta: fromAsset(DELTA.toString()),
        status: currentValue.lte(maxValue) ? '✔': '✘'
    }


    return [min, max];
}

module.exports = {
    strategyTest: strategyTest,
}
