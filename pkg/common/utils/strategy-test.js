const hre = require("hardhat");
const { deployments, getNamedAccounts, ethers } = require("hardhat");
const BigNumber = require('bignumber.js');
const { expect } = require("chai");
const chai = require("chai");
chai.use(require('chai-bignumber')());
const { resetHardhat, greatLess } = require("./tests");
const { toE6, toE18, fromAsset } = require("./decimals");
const { evmCheckpoint, evmRestore, sharedBeforeEach } = require("./sharedBeforeEach");
const { transferAsset, getERC20, transferETH, initWallet, execTimelock } = require("./script-utils");
const ERC20 = require("./abi/IERC20.json");
const { Roles } = require("./roles");
const HedgeExchangerABI = require('./abi/HedgeExchanger.json');


function strategyTest(strategyParams, network, assetName, runStrategyLogic) {

    let values = [
        {
            value: 0.02,
        },
        {
            value: 0.2,
        },
        {
            value: 2,
        },
        {
            value: 20,
        },
        {
            value: 100,
        },
        {
            value: 200,
        },
        {
            value: 2000,
        },
        {
            value: 20000,
        },
        {
            value: 100000,
        },
        {
            value: 200000,
        },
        // {
        //     value: 1000000,
        // },
        // {
        //     value: 2000000,
        // },
    ]

    describe(`${strategyParams.name}`, function () {

        stakeUnstake(strategyParams, network, assetName, values, runStrategyLogic);

        unstakeFull(strategyParams, network, assetName, values, runStrategyLogic);

        if (strategyParams.enabledReward) {
            claimRewards(strategyParams, network, assetName, values, runStrategyLogic);
        }

    });
}

function stakeUnstake(strategyParams, network, assetName, values, runStrategyLogic) {

    describe(`Stake/unstake`, function () {

        let recipient;

        let strategy;

        let asset;
        let toAsset = function () { };

        sharedBeforeEach("deploy", async () => {

            let values = await setUp(network, strategyParams, assetName, runStrategyLogic);

            recipient = values.recipient;
            strategy = values.strategy;
            asset = values.asset;
            toAsset = values.toAsset;
        });

        values.forEach(item => {

            let stakeValue = item.value;
            let navPercent = item.navPercent ? item.navPercent : 0.2;
            let liqPercent = item.liqPercent ? item.liqPercent : 0.4;
            let freeAssetPercent = item.freeAssetPercent ? item.freeAssetPercent : 0.01;

            let unstakePercent = strategyParams.unstakePercent ? strategyParams.unstakePercent : 50;
            let unstakeDeltaPercent = strategyParams.unstakeDeltaPercent ? strategyParams.unstakeDeltaPercent : 1;
            let unstakeValue = stakeValue * unstakePercent / 100;

            describe(`Stake ${stakeValue}`, function () {

                let balanceAsset;

                let VALUE;
                let NAV_DELTA;
                let LIQ_DELTA;
                let FREE_ASSET_DELTA;

                let netAssetValue;
                let liquidationValue;
                let freeAsset;

                sharedBeforeEach(`Stake ${stakeValue}`, async () => {

                    let assetValue = toAsset(stakeValue);
                    VALUE = new BigNumber(assetValue);
                    NAV_DELTA = VALUE.times(new BigNumber(navPercent)).div(100);
                    LIQ_DELTA = VALUE.times(new BigNumber(liqPercent)).div(100);
                    FREE_ASSET_DELTA = VALUE.times(new BigNumber(freeAssetPercent)).div(100);

                    await asset.transfer(recipient.address, assetValue);

                    let balanceAssetBefore = new BigNumber((await asset.balanceOf(recipient.address)).toString());

                    let amount = toAsset(stakeValue / 2);

                    console.log(`before transfer. NAV: ${await strategy.netAssetValue()}`);
                    await asset.connect(recipient).transfer(strategy.address, amount);

                    console.log(`before first stake. NAV: ${await strategy.netAssetValue()}`);
                    await strategy.connect(recipient).stake(asset.address, amount);
                    console.log(`after first stake. NAV: ${await strategy.netAssetValue()}`);

                    await asset.connect(recipient).transfer(strategy.address, amount);
                    console.log(`before second stake. NAV: ${await strategy.netAssetValue()}`);
                    await strategy.connect(recipient).stake(asset.address, amount);
                    console.log(`after second stake. NAV: ${await strategy.netAssetValue()}`);

                    let balanceAssetAfter = new BigNumber((await asset.balanceOf(recipient.address)).toString());

                    balanceAsset = balanceAssetBefore.minus(balanceAssetAfter);
                    netAssetValue = new BigNumber((await strategy.netAssetValue()).toString());
                    liquidationValue = new BigNumber((await strategy.liquidationValue()).toString());
                    freeAsset = new BigNumber((await asset.balanceOf(strategy.address)).toString());

                    let items = [
                        ...createCheck('stake', 'balance', assetValue, balanceAsset, VALUE, VALUE),
                        ...createCheck('stake', 'netAssetValue', assetValue, netAssetValue, VALUE.minus(NAV_DELTA), VALUE.plus(NAV_DELTA)),
                        ...createCheck('stake', 'liquidationValue', assetValue, liquidationValue, VALUE.minus(LIQ_DELTA), VALUE.plus(LIQ_DELTA)),
                        ...createCheck('stake', 'freeAsset', assetValue, freeAsset, new BigNumber(0), FREE_ASSET_DELTA.plus(FREE_ASSET_DELTA)),
                    ]

                    console.table(items);

                });

                it(`Balance equal ${stakeValue}`, async function () {
                    expect(balanceAsset.eq(VALUE)).to.equal(true);
                });

                it(`NetAssetValue asset is in range`, async function () {
                    greatLess(netAssetValue, VALUE, NAV_DELTA);
                });

                it(`LiquidationValue asset is in range`, async function () {
                    greatLess(liquidationValue, VALUE, LIQ_DELTA);
                });

                it(`Free asset is in range`, async function () {
                    greatLess(freeAsset, FREE_ASSET_DELTA, FREE_ASSET_DELTA);
                });


                describe(`UnStake ${unstakeValue}`, function () {

                    let balanceAsset;

                    let UNSTAKE_VALUE;
                    let NAV_DELTA;
                    let LIQ_DELTA;

                    let netAssetValue;
                    let liquidationValue;
                    let freeAsset;

                    sharedBeforeEach(`Unstake ${unstakeValue}`, async () => {

                        let assetValue = toAsset(unstakeValue);
                        UNSTAKE_VALUE = new BigNumber(assetValue);
                        UNSTAKE_DELTA = UNSTAKE_VALUE.times(new BigNumber(unstakeDeltaPercent)).div(100);
                        NAV_DELTA = VALUE.times(new BigNumber(navPercent)).div(100);
                        LIQ_DELTA = VALUE.times(new BigNumber(liqPercent)).div(100);

                        if (strategyParams.unstakeDelay) {
                            let delay = strategyParams.unstakeDelay;
                            await ethers.provider.send("evm_increaseTime", [delay]);
                            await ethers.provider.send('evm_mine');
                        }

                        let balanceAssetBefore = new BigNumber((await asset.balanceOf(recipient.address)).toString());

                        await strategy.connect(recipient).unstake(asset.address, assetValue, recipient.address, false);

                        let balanceAssetAfter = new BigNumber((await asset.balanceOf(recipient.address)).toString());

                        balanceAsset = balanceAssetAfter.minus(balanceAssetBefore);
                        netAssetValue = new BigNumber((await strategy.netAssetValue()).toString());
                        liquidationValue = new BigNumber((await strategy.liquidationValue()).toString());
                        freeAsset = new BigNumber((await asset.balanceOf(strategy.address)).toString());

                        let items = [
                            ...createCheck('unstake', 'balance', assetValue, balanceAsset, UNSTAKE_VALUE, UNSTAKE_VALUE.plus(UNSTAKE_DELTA)),
                            ...createCheck('unstake', 'netAssetValue', assetValue, netAssetValue, VALUE.minus(UNSTAKE_VALUE).minus(NAV_DELTA), VALUE.minus(UNSTAKE_VALUE).plus(NAV_DELTA)),
                            ...createCheck('unstake', 'liquidationValue', assetValue, liquidationValue, VALUE.minus(UNSTAKE_VALUE).minus(LIQ_DELTA), VALUE.minus(UNSTAKE_VALUE).plus(LIQ_DELTA)),
                            ...createCheck('unstake', 'freeAsset', assetValue, freeAsset, new BigNumber(0), new BigNumber(0)),
                        ]

                        console.table(items);
                    });

                    it(`Balance asset is in range`, async function () {
                        expect(balanceAsset.gte(UNSTAKE_VALUE)).to.equal(true);
                        expect(balanceAsset.lte(UNSTAKE_VALUE.plus(UNSTAKE_DELTA))).to.equal(true);
                    });

                    it(`NetAssetValue asset is in range`, async function () {
                        greatLess(netAssetValue, VALUE.minus(UNSTAKE_VALUE), NAV_DELTA);
                    });

                    it(`LiquidationValue asset is in range`, async function () {
                        greatLess(liquidationValue, VALUE.minus(UNSTAKE_VALUE), LIQ_DELTA);
                    });

                    it(`Free asset is 0`, async function () {
                        expect(freeAsset.toFixed()).to.equal('0');
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
        let toAsset = function () { };

        sharedBeforeEach("deploy", async () => {
            let values = await setUp(network, strategyParams, assetName, runStrategyLogic);

            recipient = values.recipient;
            strategy = values.strategy;
            asset = values.asset;
            toAsset = values.toAsset
        });


        values.forEach(item => {

            let stakeValue = item.value;
            let navPercent = item.navPercent ? item.navPercent : 0.2;
            let liqPercent = item.liqPercent ? item.liqPercent : 0.4;

            describe(`Stake ${stakeValue} => UnstakeFull`, function () {

                let balanceAsset;

                let netAssetValue;
                let liquidationValue;

                let VALUE;
                let NAV_DELTA;
                let LIQ_DELTA;

                let freeAsset;

                sharedBeforeEach(`Unstake ${stakeValue}`, async () => {

                    let assetValue = toAsset(stakeValue);
                    VALUE = new BigNumber(assetValue);
                    NAV_DELTA = VALUE.times(new BigNumber(navPercent)).div(100);
                    LIQ_DELTA = VALUE.times(new BigNumber(liqPercent)).div(100);

                    await asset.transfer(recipient.address, assetValue);

                    await asset.connect(recipient).transfer(strategy.address, assetValue);
                    await strategy.connect(recipient).stake(asset.address, assetValue);

                    if (strategyParams.unstakeDelay) {
                        let delay = strategyParams.unstakeDelay;
                        await ethers.provider.send("evm_increaseTime", [delay]);
                        await ethers.provider.send('evm_mine');
                    }
                    console.log("----a----");
                    const navBeforeUnstake = new BigNumber((await strategy.netAssetValue()).toString());
                    let tx = await (await strategy.connect(recipient).unstake(asset.address, 0, recipient.address, true)).wait();
                    console.log("----b----");
                    let rewardEvent = tx.events.find((e) => e.event === 'Reward');
                    let rewardAmount = new BigNumber('0');
                    if (rewardEvent) {
                        rewardAmount = new BigNumber(rewardEvent.args.amount.toString());
                    }

                    // UnstakeFull call claimRewards and getting value may distort the result => Remove the sum of the received rewards
                    balanceAsset = (new BigNumber((await asset.balanceOf(recipient.address)).toString())).minus(rewardAmount);

                    netAssetValue = new BigNumber((await strategy.netAssetValue()).toString());
                    liquidationValue = new BigNumber((await strategy.liquidationValue()).toString());
                    freeAsset = new BigNumber((await asset.balanceOf(strategy.address)).toString());

                    let items = [
                        ...createCheck('unstakeFull', 'rewardAmount', assetValue, rewardAmount),
                        ...createCheck('unstakeFull', 'NAV before unstake', assetValue, navBeforeUnstake),
                        ...createCheck('unstakeFull', 'balance', assetValue, balanceAsset, VALUE.times(9996).div(10000), undefined),
                        ...createCheck('unstakeFull', 'netAssetValue', assetValue, netAssetValue, new BigNumber(0), new BigNumber(0)),
                        ...createCheck('unstakeFull', 'liquidationValue', assetValue, liquidationValue, new BigNumber(0), new BigNumber(0)),
                        ...createCheck('unstakeFull', 'freeAsset', assetValue, freeAsset, new BigNumber(0), new BigNumber(0)),
                    ]

                    console.table(items);

                });

                it(`Balance asset after unstakeFull >= stake value minus 4 bp`, async function () {
                    expect(balanceAsset.gte(VALUE.times(9996).div(10000))).to.equal(true);
                });

                // it(`NetAssetValue asset is 0`, async function () {
                //     expect(netAssetValue.toFixed()).to.equal('0');
                // });
                //
                // it(`LiquidationValue asset is 0`, async function () {
                //     expect(liquidationValue.toFixed()).to.equal('0');
                // });
                //
                // it(`Free asset is 0`, async function () {
                //     expect(freeAsset.toFixed()).to.equal('0');
                // });

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
        let toAsset = function () { };

        sharedBeforeEach(`deploy`, async () => {
            let values = await setUp(network, strategyParams, assetName, runStrategyLogic);

            recipient = values.recipient;
            strategy = values.strategy;
            asset = values.asset;
            toAsset = values.toAsset
        });

        values.forEach(item => {

            let stakeValue = item.value;
            let freeAssetPercent = item.freeAssetPercent ? item.freeAssetPercent : 0.1;

            describe(`Stake ${stakeValue} => ClaimRewards`, function () {

                let balanceAsset;
                let freeAsset;
                let FREE_ASSET_DELTA;

                sharedBeforeEach(`rewards ${stakeValue}`, async () => {

                    try {
                        balanceAsset = new BigNumber("-999999999999999999999");
                        let assetValue = toAsset(stakeValue);
                        FREE_ASSET_DELTA = new BigNumber(assetValue).times(new BigNumber(freeAssetPercent)).div(100);

                        await asset.transfer(recipient.address, assetValue);
                        console.log(`Stake/claim rewards`);
                        console.log(`before transfer. strategy NAV: ${await strategy.netAssetValue()}`);
                        await asset.connect(recipient).transfer(strategy.address, assetValue);
                        console.log(`before stake. strategy NAV: ${await strategy.netAssetValue()}`);
                        await strategy.connect(recipient).stake(asset.address, assetValue);
                        console.log(`after stake. strategy NAV: ${await strategy.netAssetValue()}`);

                        let delay;
                        if (strategyParams.delay) {
                            delay = strategyParams.delay;
                        } else {
                            delay = 7 * 24 * 60 * 60;
                        }
                        await ethers.provider.send("evm_increaseTime", [delay]);
                        await ethers.provider.send('evm_mine');

                        if (strategyParams.doubleStakeReward) {
                            console.log(`doubleStakeReward. before transfer. NAV: ${await strategy.netAssetValue()}`);
                            await asset.transfer(recipient.address, assetValue);
                            await asset.connect(recipient).transfer(strategy.address, assetValue);
                            console.log(`doubleStakeReward. before stake. NAV: ${await strategy.netAssetValue()}`);
                            await strategy.connect(recipient).stake(asset.address, assetValue);
                            console.log(`doubleStakeReward. after stake. NAV: ${await strategy.netAssetValue()}`);
                        }

                        await strategy.connect(recipient).claimRewards(recipient.address);

                        balanceAsset = new BigNumber((await asset.balanceOf(recipient.address)).toString());
                        //balances.push(balanceAsset.toString());
                        freeAsset = new BigNumber((await asset.balanceOf(strategy.address)).toString());
                        let items = [
                            ...createCheck('claimRewards', 'rewards', new BigNumber(0), balanceAsset, new BigNumber(0), undefined, true),
                            ...createCheck('claimRewards', 'freeAsset', new BigNumber(0), freeAsset, new BigNumber(0), FREE_ASSET_DELTA.plus(FREE_ASSET_DELTA)),
                        ]
    
                        console.table(items);    
                    }
                    finally {
                        balances.push(balanceAsset.toString());
                    }                   
                });

                it(`Rewards > 0`, async function () {
                    expect(balanceAsset.toNumber()).to.greaterThan(0);
                });

                it(`Free asset is in range`, async function () {
                    greatLess(freeAsset, FREE_ASSET_DELTA, FREE_ASSET_DELTA);
                });

            });

        });

    });

    if (strategyParams.doubleFarm) {

        describe(`Double Stake/ClaimRewards`, function () {

            let recipient;

            let strategy;

            let asset;
            let toAsset = function () { };

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
                let freeAssetPercent = item.freeAssetPercent ? item.freeAssetPercent : 0.1;

                describe(`Stake ${stakeValue} => ClaimRewards`, function () {

                    let balanceAsset;
                    let balanceAssetDoubleFarm;
                    let freeAsset;
                    let FREE_ASSET_DELTA;

                    sharedBeforeEach(`rewards ${stakeValue}`, async () => {

                        let assetValue = new BigNumber(toAsset(stakeValue));
                        let totalStaked = new BigNumber(assetValue);
                        FREE_ASSET_DELTA = new BigNumber(assetValue).times(new BigNumber(freeAssetPercent)).div(100);

                        await asset.transfer(recipient.address, assetValue.toString());
                        await asset.connect(recipient).transfer(strategy.address, assetValue.toString());
                        await strategy.connect(recipient).stake(asset.address, assetValue.toString());

                        if (strategyParams.doubleStakeReward) {
                            await asset.transfer(recipient.address, assetValue.toString());
                            await asset.connect(recipient).transfer(strategy.address, assetValue.toString());
                            await strategy.connect(recipient).stake(asset.address, assetValue.toString());
                            totalStaked = totalStaked.plus(assetValue);
                        }

                        await asset.transfer(recipient.address, totalStaked.toString());
                        await asset.connect(recipient).transfer(strategy.address, totalStaked.toString());
                        await strategy.connect(recipient).stake(asset.address, totalStaked.toString());

                        let delay;
                        if (strategyParams.delay) {
                            delay = strategyParams.delay;
                        } else {
                            delay = 7 * 24 * 60 * 60;
                        }
                        await ethers.provider.send("evm_increaseTime", [delay]);
                        await ethers.provider.send('evm_mine');

                        await strategy.connect(recipient).claimRewards(recipient.address);

                        balanceAssetDoubleFarm = new BigNumber((await asset.balanceOf(recipient.address)).toString());
                        balanceAsset = new BigNumber(balances[i]);
                        i++;
                        freeAsset = new BigNumber((await asset.balanceOf(strategy.address)).toString());

                        let items = [
                            ...createCheck('claimRewards', 'double rewards', new BigNumber(0), balanceAssetDoubleFarm,
                            balanceAsset.times(new BigNumber(strategyParams.doubleFarmMultiplier)), undefined, true),
                            ...createCheck('claimRewards', 'freeAsset', new BigNumber(0), freeAsset, new BigNumber(0), FREE_ASSET_DELTA.plus(FREE_ASSET_DELTA)),
                        ]

                        console.table(items);
                    });

                    it(`Balance asset after double farm ${strategyParams.doubleFarmMultiplier} times greater than balance asset after single farm`, async function () {
                        // if number is negative it means there was an error during rewards stake/claim (prev test set), so we don't compare.
                        if (balanceAssetDoubleFarm > 0 && !balanceAsset.isNegative()) { 
                            expect(balanceAssetDoubleFarm.toNumber()).to.greaterThan(balanceAsset.times(new BigNumber(strategyParams.doubleFarmMultiplier)).toNumber());
                        }
                    });

                    it(`Free asset is in range`, async function () {
                        greatLess(freeAsset, FREE_ASSET_DELTA, FREE_ASSET_DELTA);
                    });

                });

            });

        });
    }
}

async function setUp(network, strategyParams, assetName, runStrategyLogic) {

    console.log(`SetUp: Network: ${network}; AssetName: ${assetName}`)
    await hre.run("compile");
    await resetHardhat(network);

    hre.ovn = {
        setting: true,
        noDeploy: false,
        tags: strategyParams.name
    }

    let strategyName = strategyParams.name;
    await deployments.fixture([strategyName]);

    const signers = await ethers.getSigners();
    const recipient = signers[1];

    let wallet = await initWallet();
    const strategy = (await ethers.getContract(strategyName)).connect(wallet);
    await strategy.setStrategyParams(recipient.address, recipient.address);

    if (strategyParams.isRunStrategyLogic) {
        console.log(`RunStrategyLogic: ${strategyName}`)
        await runStrategyLogic(strategyName, strategy.address);
    }

    let mainAddress = (await initWallet()).address;
    await transferETH(100, mainAddress);


    // Support ETH+
    // Remove it -> throw error: ERC20 token not found.
    if (assetName === 'eth') {
        assetName = 'weth'
    }
    const asset = await getERC20(assetName);
    await transferAsset(asset.address, mainAddress);
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

// Provider better visual representation – one check parameter is printer on one line, with min/max, distances from min / to max, etc.
function createCheck(type, name, assetValue, providedAssetValue, minExpectedValue, maxExpectedValue, strictlyGreaterMin, strictlyLessMax) {
    const minValProvided = typeof minExpectedValue !== "undefined";
    const maxValProvided = typeof maxExpectedValue !== "undefined";

    const minValDisplay = minValProvided ? fromAsset(minExpectedValue.toString()) : "-∞";
    const maxValDisplay = maxValProvided ? fromAsset(maxExpectedValue.toString()) : "∞";

    const minBracket = strictlyGreaterMin || !minValProvided ? "(" : "[";
    const maxBracket = strictlyLessMax || !maxValProvided ? ")" : "]";
    const line = {        
        type,
        asset: fromAsset(assetValue.toString()),
        name,
        interval: `${minBracket}${minValDisplay}; ${maxValDisplay}${maxBracket}`,
        provided: fromAsset(providedAssetValue.toString()),
        fromMin: minValProvided ? fromAsset(providedAssetValue.minus(minExpectedValue).toString()) : "-",
        toMax: maxValProvided ? fromAsset(maxExpectedValue.minus(providedAssetValue).toString()) : "-",
        status: (
                (!minValProvided || (strictlyGreaterMin ? providedAssetValue.gt(minExpectedValue) : providedAssetValue.gte(minExpectedValue))) && 
                (!maxValProvided || (strictlyLessMax ? providedAssetValue.lt(maxExpectedValue) : providedAssetValue.lte(maxExpectedValue)))
        ) ? '✔' : '✘',
    };

    return [line];
}

function createCheck_old(type, name, assetValue, currentValue, minValue, maxValue, isGt, isLt) {

    if (minValue.eq(maxValue)) {

        let zero = {
            type: type,
            name: `${name}`,
            input: fromAsset(assetValue.toString()),
            current: fromAsset(currentValue.toString()),
            expected: fromAsset(minValue.toString()),
            difference: fromAsset(currentValue.minus(minValue).toString()),
            status: currentValue.eq(minValue) ? '✔' : '✘'
        }

        return [zero];
    }

    let values = [];

    let min = {
        type: type,
        name: `${name}:min`,
        input: fromAsset(assetValue.toString()),
        current: fromAsset(currentValue.toString()),
        expected: fromAsset(minValue.toString()),
        difference: fromAsset(currentValue.minus(minValue).toString()),
        status: (isGt ? currentValue.gt(minValue) : currentValue.gte(minValue)) ? '✔' : '✘'
    }

    values.push(min);

    if (maxValue.isPositive()) {

        let max = {
            type: type,
            name: `${name}:max`,
            input: fromAsset(assetValue.toString()),
            current: fromAsset(currentValue.toString()),
            expected: fromAsset(maxValue.toString()),
            difference: fromAsset(maxValue.minus(currentValue).toString()),
            status: (isLt ? currentValue.lt(maxValue) : currentValue.lte(maxValue)) ? '✔' : '✘'
        }

        values.push(max);
    }

    return values;
}

module.exports = {
    strategyTest: strategyTest,
}
