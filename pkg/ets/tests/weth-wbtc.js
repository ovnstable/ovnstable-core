const hre = require("hardhat");
const {deployments, ethers} = require("hardhat");
const {resetHardhat} = require("@overnight-contracts/common/utils/tests");
const {toE6, toE8, toE18, fromE6, fromE8, fromAsset} = require("@overnight-contracts/common/utils/decimals");
const {expect} = require("chai");
const {sharedBeforeEach} = require("@overnight-contracts/common/utils/sharedBeforeEach");
const BigNumber = require('bignumber.js');
const chai = require("chai");
chai.use(require('chai-bignumber')());

const {waffle} = require("hardhat");
const {getContract, execTimelock, getERC20, initWallet} = require("@overnight-contracts/common/utils/script-utils");
const {transferETH, transferUSDPlus, transferWBTC} = require("@overnight-contracts/common/utils/script-utils");
const {OPTIMISM} = require("@overnight-contracts/common/utils/assets");
const {provider} = waffle;

let nonfungiblePositionManager = '0xC36442b4a4522E871399CD717aBDD847Ab11FE88';
let uniswapV3Pool = '0x73B14a78a0D396C521f954532d43fd5fFe385216';
let beethovenxVault = '0xBA12222222228d8Ba445958a75a0704d566BF2C8';
let poolIdWethWbtc = "0x5028497af0c9a54ea8c6d42a054c0341b9fc6168000100000000000000000004";
let poolFee0 = 3000; // 0.3%
let tokenAssetSlippagePercent = 100; //1%
let liquidationThreshold = 750;
let healthFactor = 1200;
let isStableVeloWbtc = false;
let isStableOpWbtc = false;
let lowerPercent = 0; //30%
let upperPercent = 0; //30%

describe("OPTIMISM", function () {
    let value = {
        name: 'StrategyWethWbtc',
        enabledReward: true,
    };

    strategyTest(value, 'OPTIMISM', OPTIMISM.usdPlus, () => {});
});

function strategyTest(strategyParams, network, assetAddress, runStrategyLogic) {

    let values = [
        // {
        //     value: 0.00002,
        //     deltaPercent: 5,
        // },
        // {
        //     value: 0.0002,
        //     deltaPercent: 5,
        // },
        // {
        //     value: 0.002,
        //     deltaPercent: 5,
        // },
        // {
        //     value: 0.02,
        //     deltaPercent: 1,
        // },
        // {
        //     value: 0.2,
        //     deltaPercent: 1,
        // },
        {
            value: 2,
            deltaPercent: 1,
        },
        // {
        //     value: 20,
        //     deltaPercent: 1,
        // },
    ]

    describe(`${strategyParams.name}`, function () {
        stakeUnstake(strategyParams, network, assetAddress, values, runStrategyLogic);
        // claimRewards(strategyParams, network, assetAddress, values, runStrategyLogic);
    });
}

function stakeUnstake(strategyParams, network, assetAddress, values, runStrategyLogic) {

    describe(`Stake/unstake`, function () {

        let account;
        let recipient;

        let strategy;
        let strategyName;

        let asset;
        let toAsset = function () {
        };

        let expectedHealthFactor = '1200000000000000000';
        let healthFactorDELTA = '10000000000000000';

        sharedBeforeEach("deploy", async () => {
            await hre.run("compile");
            const signers = await ethers.getSigners();
            account = signers[0];
            recipient = provider.createEmptyWallet();
            
            await transferETH(10, recipient.address);
            await transferETH(10, account.address);
            await transferETH(10, (await initWallet()).address);
            await transferWBTC(1000000, account.address);
            
            strategyName = strategyParams.name;
            await deployments.fixture([strategyName, 'ControlWethWbtc']);
            strategy = await ethers.getContract(strategyName);
            let control = await ethers.getContract('ControlWethWbtc');
            await strategy.setExchanger(recipient.address);

            let setupParams = {
                control: control.address,
                // strategy params
                weth: OPTIMISM.weth,
                wbtc: OPTIMISM.wbtc,
                nonfungiblePositionManager: nonfungiblePositionManager,
                uniswapV3Pool: uniswapV3Pool,
                lowerPercent: lowerPercent,
                upperPercent: upperPercent,
                poolFee0: poolFee0,
                // aave params
                aavePoolAddressesProvider: OPTIMISM.aaveProvider,
                tokenAssetSlippagePercent: tokenAssetSlippagePercent,
                liquidationThreshold: liquidationThreshold,
                healthFactor: healthFactor,
                rewardsController: OPTIMISM.rewardsController,
                aWbtc: OPTIMISM.aWbtc,
                op: OPTIMISM.op,
                isStableVeloWbtc: isStableVeloWbtc,
                isStableOpWbtc: isStableOpWbtc,
                beethovenxVault: beethovenxVault,
                poolIdWethWbtc: poolIdWethWbtc
            }
            
            await (await strategy.setParams(setupParams)).wait();
            await execTimelock(async (timelock) => {
                let exchange = await getContract('Exchange');
                console.log(`exchange: ${exchange.address}`);
                await exchange.connect(timelock).grantRole(await exchange.FREE_RIDER_ROLE(), strategy.address);
                console.log(`FREE_RIDER_ROLE granted to ${strategy.address}`);
            });
            
            asset = await getERC20("wbtc");
            let decimals = await asset.decimals();
            if (decimals === 18) {
                toAsset = toE18;
            } else if (decimals === 8) {
                toAsset = toE8;
            } else {
                toAsset = toE6;
            }
        });

        values.forEach(item => {
            let stakeValue = item.value;
            let deltaPercent = item.deltaPercent ? item.deltaPercent : 5;
            let unstakeValue = stakeValue / 2;

            describe(`Stake ${stakeValue}`, function () {
                let balanceAsset;
                let expectedNetAsset;

                let VALUE;
                let DELTA;

                let netAssetValueCheck;
                let healthFactor;

                sharedBeforeEach(`Stake ${stakeValue}`, async () => {

                    try {
                        await m2m(strategy);
                        console.log("1");
                        let assetValue = toAsset(stakeValue);
                        console.log("2");
                        VALUE = new BigNumber(assetValue);
                        console.log("3");
                        DELTA = VALUE.multipliedBy(new BigNumber(deltaPercent)).div(100);
                        console.log("4");
                        await asset.connect(account).transfer(recipient.address, assetValue);
                        console.log("5");
                        let balanceAssetBefore = new BigNumber((await asset.balanceOf(recipient.address)).toString());
                        console.log("6");
                        expectedNetAsset = (new BigNumber((await strategy.netAssetValue()).toString())).plus(VALUE);
                        console.log("7");
                        console.log(`expectedNetAsset: ${expectedNetAsset}`)
                        console.log("8");

                        await asset.connect(recipient).transfer(strategy.address, assetValue/2);
                        await strategy.connect(recipient).stake(assetValue/2);
                        await m2m(strategy);
                        await asset.connect(recipient).transfer(strategy.address, assetValue/2);
                        await strategy.connect(recipient).stake(assetValue/2);
                        let balanceAssetAfter = new BigNumber((await asset.balanceOf(recipient.address)).toString());
                        balanceAsset = balanceAssetBefore.minus(balanceAssetAfter);
                        netAssetValueCheck = new BigNumber((await strategy.netAssetValue()).toString());
                        console.log(`----------------------`)
                        console.log(`balanceAssetAfter: ${balanceAssetAfter}`)
                        console.log(`balanceAsset: ${balanceAsset}`)
                        console.log(`netAssetValueCheck: ${netAssetValueCheck}`)
                        console.log(`----------------------`)
                        healthFactor = await strategy.currentHealthFactor();

                        await m2m(strategy);
                    } catch (e) {
                        console.log(e)
                        throw e;
                    }
                });

                it(`Balance asset is in range`, async function () {
                    greatLess(balanceAsset, VALUE, DELTA);
                });

                it(`NetAssetValue asset is in range`, async function () {
                    greatLess(netAssetValueCheck, expectedNetAsset, DELTA);
                });

                it(`Health Factor is in range`, async function () {
                    greatLess(healthFactor, expectedHealthFactor, healthFactorDELTA);
                });

                describe(`UnStake ${unstakeValue}`, function () {

                    let balanceAsset;
                    let expectedNetAsset;
                    let expectedLiquidation;

                    let VALUE;
                    let DELTA;

                    let netAssetValueCheck;
                    let healthFactor;

                    sharedBeforeEach(`Unstake ${unstakeValue}`, async () => {

                        await m2m(strategy);
                        let assetValue = toAsset(unstakeValue);
                        VALUE = new BigNumber(assetValue);
                        DELTA = VALUE.times(new BigNumber(deltaPercent)).div(100);

                        let balanceAssetBefore = new BigNumber((await asset.balanceOf(recipient.address)).toString());

                        expectedNetAsset = new BigNumber((await strategy.netAssetValue()).toString()).minus(VALUE);

                        await strategy.connect(recipient).unstake(assetValue, recipient.address);

                        let balanceAssetAfter = new BigNumber((await asset.balanceOf(recipient.address)).toString());

                        balanceAsset = balanceAssetAfter.minus(balanceAssetBefore);

                        netAssetValueCheck = new BigNumber((await strategy.netAssetValue()).toString());
                        healthFactor = await strategy.currentHealthFactor();

                        await m2m(strategy);

                    });

                    it(`Balance asset is in range`, async function () {
                        greatLess(balanceAsset, VALUE, DELTA);
                    });

                    it(`NetAssetValue asset is in range`, async function () {
                        greatLess(netAssetValueCheck, expectedNetAsset, DELTA);
                    });

                    it(`Health Factor is in range`, async function () {
                        greatLess(healthFactor, expectedHealthFactor, healthFactorDELTA);
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
        let strategyName;

        let wbtcToken;
        let asset;
        let toAsset = function () {
        };

        let expectedHealthFactor = '1200000000000000000';
        let healthFactorDELTA = '10000000000000000';

        sharedBeforeEach("deploy", async () => {
            await hre.run("compile");
            const signers = await ethers.getSigners();
            account = signers[0];
            recipient = provider.createEmptyWallet();

            await transferETH(10, recipient.address);
            await transferETH(10, account.address);
            await transferETH(10, (await initWallet()).address);
            strategyName = strategyParams.name;

            await deployments.fixture([strategyName, 'ControlWethWbtc']);

            strategy = await ethers.getContract(strategyName);
            let control = await ethers.getContract('ControlWethWbtc');
            await strategy.setExchanger(recipient.address);

            let setupParams = {
                control: control.address,
                weth: OPTIMISM.weth,
                wbtc: OPTIMISM.wbtc,
                nonfungiblePositionManager: nonfungiblePositionManager,
                uniswapV3Pool: uniswapV3Pool,
                lowerPercent: lowerPercent,
                upperPercent: upperPercent,
                poolFee0: poolFee0,
                // aave params
                aavePoolAddressesProvider: OPTIMISM.aaveProvider,
                tokenAssetSlippagePercent: tokenAssetSlippagePercent,
                liquidationThreshold: liquidationThreshold,
                healthFactor: healthFactor,
                rewardsController: OPTIMISM.rewardsController,
                aWbtc: OPTIMISM.aWbtc,
                op: OPTIMISM.op,
                isStableVeloWbtc: isStableVeloWbtc,
                isStableOpWbtc: isStableOpWbtc,
                beethovenxVault: beethovenxVault,
                poolIdWethWbtc: poolIdWethWbtc
            }

            await (await strategy.setParams(setupParams)).wait();

            await execTimelock(async (timelock) => {
                let exchange = await getContract('Exchange');
                console.log(`exchange: ${exchange.address}`);
                await exchange.connect(timelock).grantRole(await exchange.FREE_RIDER_ROLE(), strategy.address);
                console.log(`FREE_RIDER_ROLE granted to ${strategy.address}`);
            });

            wbtcToken = await getERC20("wbtc");
            asset = await getERC20("wbtc");
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
            let unstakeValue = stakeValue / 2;

            describe(`Stake ${stakeValue}`, function () {

                let balanceAsset;
                let expectedNetAsset;

                let VALUE;
                let DELTA;

                let netAssetValueCheck;
                let healthFactor;

                let balanceWbtc;

                sharedBeforeEach(`Stake ${stakeValue}`, async () => {

                    try {
                        await m2m(strategy);

                        let assetValue = toAsset(stakeValue);
                        VALUE = new BigNumber(assetValue);
                        DELTA = VALUE.multipliedBy(new BigNumber(deltaPercent)).div(100);

                        await asset.connect(account).transfer(recipient.address, assetValue);

                        let balanceAssetBefore = new BigNumber((await asset.balanceOf(recipient.address)).toString());
                        expectedNetAsset = (new BigNumber((await strategy.netAssetValue()).toString())).plus(VALUE);
                        console.log(`expectedNetAsset: ${expectedNetAsset}`)

                        await asset.connect(recipient).transfer(strategy.address, assetValue);
                        await strategy.connect(recipient).stake(assetValue);
                        let balanceAssetAfter = new BigNumber((await asset.balanceOf(recipient.address)).toString());
                        balanceAsset = balanceAssetBefore.minus(balanceAssetAfter);
                        netAssetValueCheck = new BigNumber((await strategy.netAssetValue()).toString());
                        console.log(`----------------------`)
                        console.log(`balanceAssetAfter: ${balanceAssetAfter}`)
                        console.log(`balanceAsset: ${balanceAsset}`)
                        console.log(`netAssetValueCheck: ${netAssetValueCheck}`)
                        console.log(`----------------------`)
                        healthFactor = await strategy.currentHealthFactor();

                        await m2m(strategy);

                        const sevenDays = 7 * 24 * 60 * 60 * 1000;
                        await ethers.provider.send("evm_increaseTime", [sevenDays])
                        await ethers.provider.send('evm_mine');

                        balanceWbtcBefore = new BigNumber((await wbtcToken.balanceOf(strategy.address)).toString());
                        console.log("balanceWbtcBefore", balanceWbtcBefore.toString());
                        await strategy.connect(recipient).claimRewards(recipient.address);
                        balanceWbtcAfter = new BigNumber((await wbtcToken.balanceOf(strategy.address)).toString());
                        console.log("balanceWbtcAfter", balanceWbtcAfter.toString());

                        balanceWbtc = balanceWbtcAfter.minus(balanceWbtcBefore);

                        await m2m(strategy);
                    } catch (e) {
                        console.log(e)
                        throw e;
                    }

                });

                it(`Balance wbtc > 0`, async function () {
                    expect(balanceWbtc.toNumber()).to.greaterThan(0);
                });

            });

        });

    });
}

async function m2m(strategy) {
    console.log('ETS:')

    let values = [];
    values.push({name: 'Total NAV', value: fromE8((await strategy.netAssetValue()).toString())});
    values.push({name: 'HF', value: (await strategy.currentHealthFactor()).toString()});

    console.table(values);

    let items = await strategy.balances();

    let names = ['borrowToken', 'collateralAsset', 'poolToken', 'poolWbtc', 'freeWbtc', 'freeToken']
    let arrays = [];
    for (let i = 0; i < items.length; i++) {

        let item = items[i];

        arrays.push({
            asset: item[0],
            name: names[i],
            amountUSD: fromE6(item[1].toString()),
            borrowed: item[3].toString()
        })

    }

    console.table(arrays);
}

function greatLess(value, expected, delta) {

    value = new BigNumber(value.toString());
    expected = new BigNumber(expected.toString());
    let maxValue = expected.plus(delta);
    let minValue = expected.minus(delta);

    let lte = value.lte(maxValue);
    let gte = value.gte(minValue);

    let valueNumber = value.div(new BigNumber(10).pow(6)).toFixed();
    let minValueNumber = minValue.div(new BigNumber(10).pow((6)).toFixed());
    let maxValueNumber = maxValue.div(new BigNumber(10).pow(6)).toFixed();

    let minSub = (value.minus(minValue)).div(new BigNumber(10).pow(6)).toFixed();
    let maxSub = (value.minus(maxValue)).div(new BigNumber(10).pow(6)).toFixed();

    expect(gte).to.equal(true, `Value[${valueNumber}] less than Min Value[${minValueNumber}] dif:[${minSub}]`);
    expect(lte).to.equal(true, `Value[${valueNumber}] great than Max Value[${maxValueNumber}] dif:[${maxSub}]`);
}

module.exports = {
    strategyTest: strategyTest,
}
