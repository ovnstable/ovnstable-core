const hre = require("hardhat");
const {deployments, ethers} = require("hardhat");
const {toE6, toE18, fromUSDC} = require("@overnight-contracts/common/utils/decimals");
const {expect} = require("chai");
const {sharedBeforeEach} = require("@overnight-contracts/common/utils/sharedBeforeEach");
const BigNumber = require('bignumber.js');
const chai = require("chai");
chai.use(require('chai-bignumber')());

const {waffle} = require("hardhat");
const {getContract, execTimelock, getERC20} = require("@overnight-contracts/common/utils/script-utils");
const {transferETH, transferUSDPlus} = require("@overnight-contracts/common/utils/script-utils");
const {POLYGON} = require("@overnight-contracts/common/utils/assets");
const {provider} = waffle;


describe("Polygon", function () {

    let value = {
        name: 'StrategyUsdPlusWmatic',
        enabledReward: false,
        isRunStrategyLogic: false,
    }

    strategyTest(value, 'POLYGON', POLYGON.usdPlus, () => {
    });
});


function strategyTest(strategyParams, network, assetAddress, runStrategyLogic) {

    let values = [
        {
            code: 3,
            liq: {
                value: 200000000000
            },
            cmds: [
                {
                    method: "STAKE",
                    amount: 1000000000,
                },
                {
                    method: "CHANGE_K2",
                    amount: "999500000000000000",
                },
                {
                    method: "UNSTAKE",
                    amount: 600000000
                },
            ]
        },
        {
            code: 10,
            liq: {
                value: 200000000000
            },
            cmds: [
                {
                    method: "STAKE",
                    amount: 1000000000,
                },
                {
                    method: "INCREASE_WMATIC",
                    amount: 10,
                },
                {
                    method: "BALANCE"
                },
            ]
        },
        {
            code: 21,
            liq: {
                value: 200000000000
            },
            cmds: [
                {
                    method: "STAKE",
                    amount: 1000000000,
                },
                {
                    method: "DECREASE_WMATIC",
                    amount: 1
                },
                {
                    method: "BALANCE"
                },
            ]
        },
        {
            code: 24,
            liq: {
                value: 200000000000
            },
            cmds: [
                {
                    method: "STAKE",
                    amount: 1000000000,
                },
                {
                    method: "CHANGE_K2",
                    amount: "1000500000000000000",
                },
                {
                    method: "STAKE",
                    amount: 600000000
                },
            ]
        },
        {
            code: 27,
            liq: {
                value: 200000000000
            },
            cmds: [
                {
                    method: "STAKE",
                    amount: 1000000000,
                },
                {
                    method: "CHANGE_K2",
                    amount: "1000500000000000000",
                },
                {
                    method: "BALANCE"
                },
            ]
        },
        {
            code: 17,
            liq: {
                value: 200000000000
            },
            cmds: [
                {
                    method: "STAKE",
                    amount: 1000000000,
                },
                {
                    method: "CHANGE_HF",
                    amount: "1400000000000000000",
                },
                {
                    method: "BALANCE"
                },
            ]
        },
        {
            code: 10,
            liq: {
                value: 200000000000
            },
            cmds: [
                {
                    method: "STAKE",
                    amount: 1000000000,
                },
                {
                    method: "CHANGE_HF",
                    amount: "1600000000000000000",
                },
                {
                    method: "BALANCE"
                },
            ]
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
        let strategyName;

        let asset;
        let toAsset = function () {
        };

        let healthFactorDelta = '10000000000000000';
        let tokenDelta = '100';

        sharedBeforeEach("deploy", async () => {
            await hre.run("compile");

            hre.ethers.provider = new hre.ethers.providers.JsonRpcProvider('http://localhost:8545')

            const signers = await ethers.getSigners();
            account = signers[0];
            recipient = provider.createEmptyWallet();

            await transferETH(1, recipient.address);
            await transferUSDPlus(100000, account.address);

            strategyName = strategyParams.name;
            await deployments.fixture([strategyName, `${strategyName}Setting`]);


            strategy = await ethers.getContract(strategyName);
            await strategy.setExchanger(recipient.address);

            await execTimelock(async (timelock) => {
                let exchange = await getContract('Exchange');
                console.log(`exchange: ${exchange.address}`);
                await exchange.connect(timelock).grantRole(await exchange.FREE_RIDER_ROLE(), strategy.address);
                console.log(`FREE_RIDER_ROLE granted to ${strategy.address}`);
            });

            asset = await getERC20("usdPlus");
            let decimals = await asset.decimals();
            if (decimals === 18) {
                toAsset = toE18;
            } else {
                toAsset = toE6;
            }

        });

        values.forEach(item => {

            let baseCode = item.code;
            let cmds = item.cmds;
            let liq = item.liq;

            describe(`Case ${baseCode}`, function () {

                let healthFactor;
                let expectedHealthFactor;
                let code;

                let poolToken;
                let aaveToken;

                sharedBeforeEach(`Stake`, async () => {

                    let ctx = {
                        K1: '1764705882352941176',
                        K2: '1000000000000000000',
                        amount: 0,
                        liq: {
                            poolToken: 0,
                            poolUsdPlus: 0,
                            collateralAsset: 0,
                            borrowToken: 0,
                            freeToken: 0,
                            freeUsdPlus: 0,
                            freeAsset: 0,
                        },
                        tokenAssetSlippagePercent: 100
                    }
                    let ctx2;

                    try {
                        for (var i = 0; i < cmds.length; i++) {
                            let item = cmds[i];
                            if (item.method === "STAKE") {
                                [ctx2, code] = await makeStake(strategy, liq, ctx, item.amount);
                                ctx = ctx2;
                            } else if (item.method === "UNSTAKE") {
                                [ctx2, code] = await makeUnstake(strategy, liq, ctx, item.amount);
                                ctx = ctx2;
                            } else if (item.method === "BALANCE") {
                                [ctx2, code] = await makeBalance(strategy, liq, ctx);
                                ctx = ctx2;
                            } else if (item.method === "INCREASE_USDC") {
                                ctx = increaseUsdc(ctx, liq, item.amount);
                            } else if (item.method === "DECREASE_USDC") {
                                ctx = decreaseUsdc(ctx, liq, item.amount);
                            } else if (item.method === "INCREASE_WMATIC") {
                                ctx = increaseWmatic(ctx, liq, item.amount);
                            } else if (item.method === "DECREASE_WMATIC") {
                                ctx = decreaseWmatic(ctx, liq, item.amount);
                            } else if (item.method === "CHANGE_K2") {
                                ctx = changeK2(ctx, liq, item.amount);
                            } else if (item.method === "CHANGE_HF") {
                                ctx = changeHF(ctx, liq, item.amount);
                            } else {

                            }
                        }

                        expectedHealthFactor = calculateExpectedHealthFactor(ctx);
                        healthFactor = calculateHealthFactor(ctx);
                        poolToken = ctx.liq.poolToken;
                        aaveToken = ctx.liq.borrowToken;
                    } catch (e) {
                        console.log('ERROR: ' + e);
                        throw e;
                    }

                });

                it(`Case code is the same`, async function () {
                    greatLess(baseCode, code, 0);
                });

                it(`Health Factor is in range`, async function () {
                    greatLess(healthFactor, expectedHealthFactor, healthFactorDelta);
                });

                it(`Token in pool and in aave equal`, async function () {
                    greatLess(poolToken, aaveToken, tokenDelta);
                });
            });

        });

    });
}



function addStake(ctx, amount) {
    newCtx = ctx;
    newCtx.liq.freeUsdPlus += amount;
    return newCtx;
}

async function makeStake(strategy, liq, ctx, amount) {
    let newCtx = addStake(ctx, amount);
    let {0: items, 1: code} = await strategy.liquidityToActions(newCtx);
    let arrays = transformActions(items);
    // console.log(arrays);
    newCtx = immitateActions(newCtx, arrays, liq);
    return [newCtx, code];
}

async function makeUnstake(strategy, liq, ctx, amount) {
    let newCtx = addUnstake(ctx, amount);
    let {0: items, 1: code} = await strategy.liquidityToActions(newCtx);
    let arrays = transformActions(items);
    //console.log(arrays);
    newCtx = immitateActions(newCtx, arrays, liq);
    if (newCtx.liq.freeUsdPlus < amount) {
        console.log("error");
        return 0;
    }
    newCtx.liq.freeUsdPlus -= amount;
    return [newCtx, code];
}

async function makeBalance(strategy, liq, ctx) {
    let {0: items, 1: code} = await strategy.liquidityToActions(ctx);
    let arrays = transformActions(items);
    //console.log(arrays);
    let newCtx = immitateActions(ctx, arrays, liq);
    return [newCtx, code];
}

function changeK2(ctx, liq, K2) {
    let newCtx = ctx;
    newCtx.K2 = K2;
    return newCtx;
}

function changeHF(ctx, liq, HF) {
    let newCtx = ctx;
    let K1 = new BigNumber(HF.toString()).div(new BigNumber("850000000000000000")).multipliedBy(new BigNumber(10).pow(18));
    newCtx.K1 = K1.toFixed(0).toString();
    return newCtx;
}

function increaseWmatic(ctx, liq, percent) {
    let newCtx = ctx;
    newCtx.liq.poolToken = Math.floor(newCtx.liq.poolToken / 100 * (100 + percent));
    newCtx.liq.borrowToken = Math.floor(newCtx.liq.borrowToken / 100 * (100 + percent));
    newCtx.liq.freeToken = Math.floor(newCtx.liq.freeToken / 100 * (100 + percent));
    liq.value = Math.floor(liq.value / 100 * (100 + percent));
    let K2 = new BigNumber(newCtx.K2.toString());
    newCtx.K2 = K2.div(100 + percent).multipliedBy(new BigNumber((100).toString())).toFixed(0).toString();
    return newCtx;
}

function decreaseWmatic(ctx, liq, percent) {
    let newCtx = ctx;
    newCtx.liq.poolToken = Math.floor(newCtx.liq.poolToken / 100 * (100 - percent));
    newCtx.liq.borrowToken = Math.floor(newCtx.liq.borrowToken / 100 * (100 - percent));
    newCtx.liq.freeToken = Math.floor(newCtx.liq.freeToken / 100 * (100 - percent));
    liq.value = Math.floor(liq.value / 100 * (100 - percent));
    let K2 = new BigNumber(newCtx.K2.toString());
    newCtx.K2 = K2.div(100 - percent).multipliedBy(new BigNumber((100).toString())).toFixed(0).toString();
    return newCtx;
}

function increaseUsdc(ctx, liq, percent) {
    let newCtx = ctx;
    newCtx.liq.poolUsdPlus = Math.floor(newCtx.liq.poolUsdPlus / 100 * (100 + percent));
    newCtx.liq.collateralAsset = Math.floor(newCtx.liq.collateralAsset / 100 * (100 + percent));
    newCtx.liq.freeUsdPlus = Math.floor(newCtx.liq.freeUsdPlus / 100 * (100 + percent));
    newCtx.liq.freeAsset = Math.floor(newCtx.liq.freeAsset / 100 * (100 + percent));
    liq.value = Math.floor(liq.value / 100 * (100 + percent));
    let K2 = new BigNumber(newCtx.K2.toString());
    newCtx.K2 = K2.multipliedBy(100 + percent).div(new BigNumber((100).toString())).toFixed(0).toString();
    return newCtx;
}

function decreaseUsdc(ctx, liq, percent) {
    let newCtx = ctx;
    newCtx.liq.poolUsdPlus = Math.floor(newCtx.liq.poolUsdPlus / 100 * (100 - percent));
    newCtx.liq.collateralAsset = Math.floor(newCtx.liq.collateralAsset / 100 * (100 - percent));
    newCtx.liq.freeUsdPlus = Math.floor(newCtx.liq.freeUsdPlus / 100 * (100 - percent));
    newCtx.liq.freeAsset = Math.floor(newCtx.liq.freeAsset / 100 * (100 - percent));
    liq.value = Math.floor(liq.value / 100 * (100 - percent));
    let K2 = new BigNumber(newCtx.K2.toString());
    newCtx.K2 = K2.multipliedBy(100 - percent).div(new BigNumber((100).toString())).toFixed(0).toString();
    return newCtx;
}

function addUnstake(ctx, amount) {
    newCtx = ctx;
    newCtx.amount = -amount;
    return newCtx;
}

function transformActions(items) {
    let arrays = [];
    for (let i = 0; i < items.length; i++) {
        let item = items[i];
        arrays.push({
            actionType: item[0].toString(),
            amount: item[1].toString()
        })
    }
    return arrays;
}

function calculateHealthFactor(ctx) {
    let liquidationFactor = '850000000000000000';
    LF = new BigNumber(liquidationFactor.toString());
    let res = LF.multipliedBy(ctx.liq.collateralAsset).div(new BigNumber((ctx.liq.borrowToken).toString()));
    return res.toFixed(0).toString();
}

function calculateExpectedHealthFactor(ctx) {
    let liquidationFactor = '850000000000000000';
    LF = new BigNumber(liquidationFactor.toString());
    let res = LF.multipliedBy(ctx.K1).div(new BigNumber(10).pow(18));
    return res.toFixed(0).toString();
}

function stof(str) {
    let lol = (new BigNumber(str)).div(new BigNumber(10).pow(18)).toString();
    return lol;
}

function ftos(numb) {
    let lol = (new BigNumber(numb)).multipliedBy(new BigNumber(10).pow(18)).toFixed(0).toString();
    return lol;
}

function immitateActions(ctx, actions, liq) {
    let new_ctx = ctx;
    new_ctx.liq.poolToken = parseInt(ctx.liq.poolToken);
    new_ctx.liq.poolUsdPlus = parseInt(ctx.liq.poolUsdPlus);
    new_ctx.liq.collateralAsset = parseInt(ctx.liq.collateralAsset);
    new_ctx.liq.borrowToken = parseInt(ctx.liq.borrowToken);
    new_ctx.liq.freeToken = parseInt(ctx.liq.freeToken);
    new_ctx.liq.freeUsdPlus = parseInt(ctx.liq.freeUsdPlus);
    new_ctx.liq.freeAsset = parseInt(ctx.liq.freeAsset);
    new_ctx.tokenAssetSlippagePercent = parseInt(ctx.tokenAssetSlippagePercent);
    let MAX_UINT_VALUE = '115792089237316195423570985008687907853269984665640564039457584007913129639935';
    for (let i = 0; i < actions.length; i++) {
        let amount = actions[i].amount;
        switch (parseInt(actions[i].actionType)) {
            case 0:
                //ADD_LIQUIDITY_TO_DYSTOPIA
                let addWMatic;
                let addUsdp;
                if (amount === MAX_UINT_VALUE) {
                    amount = 0;
                }

                addWMatic = new_ctx.liq.freeToken;
                addUsdp = Math.floor(new BigNumber(addWMatic.toString()).multipliedBy(new_ctx.K2).div(new BigNumber(10).pow(18)).toFixed(0).toString());
                if (new_ctx.liq.freeUsdPlus - parseInt(amount) < addUsdp) {
                    addUsdp = new_ctx.liq.freeUsdPlus - parseInt(amount);
                    addWMatic = Math.floor(new BigNumber(addUsdp.toString()).div(new_ctx.K2).multipliedBy(new BigNumber(10).pow(18)).toFixed(0).toString());
                }

                new_ctx.liq.freeToken -= addWMatic;
                new_ctx.liq.freeUsdPlus -= addUsdp;
                new_ctx.liq.poolToken += addWMatic;
                new_ctx.liq.poolUsdPlus += addUsdp;
                new_ctx.K2 = ftos((liq.value * stof(new_ctx.K2) + addWMatic) / (liq.value + addUsdp));
                liq.value = liq.value + addWMatic;

                break;
            case 1:
                //REMOVE_LIQUIDITY_FROM_DYSTOPIA
                let amount2 = Math.floor(new BigNumber(amount.toString()).multipliedBy(new_ctx.K2).div(new BigNumber(10).pow(18)).toFixed(0).toString());
                new_ctx.liq.freeToken += parseInt(amount);
                new_ctx.liq.freeUsdPlus += parseInt(amount2);
                new_ctx.liq.poolToken -= parseInt(amount);
                new_ctx.liq.poolUsdPlus -= parseInt(amount2);
                new_ctx.K2 = ftos((liq.value * stof(new_ctx.K2) - amount2) / (liq.value - amount));
                liq.value = liq.value - amount;
                break;
            case 2:
                //SWAP_USDPLUS_TO_USDC
                if (amount === MAX_UINT_VALUE) {
                    new_ctx.liq.freeAsset += new_ctx.liq.freeUsdPlus;
                    new_ctx.liq.freeUsdPlus = 0;
                } else {
                    new_ctx.liq.freeAsset += parseInt(amount);
                    new_ctx.liq.freeUsdPlus -= parseInt(amount);
                }
                break;
            case 3:
                //SWAP_USDC_TO_USDPLUS
                if (amount === MAX_UINT_VALUE) {
                    new_ctx.liq.freeUsdPlus += new_ctx.liq.freeAsset;
                    new_ctx.liq.freeAsset = 0;
                } else {
                    new_ctx.liq.freeUsdPlus += parseInt(amount);
                    new_ctx.liq.freeAsset -= parseInt(amount);
                }
                break;
            case 4:
                //SUPPLY_USDC_TO_AAVE
                if (amount === MAX_UINT_VALUE) {
                    new_ctx.liq.collateralAsset += new_ctx.liq.freeAsset;
                    new_ctx.liq.freeAsset = 0;
                } else {
                    new_ctx.liq.collateralAsset += parseInt(amount);
                    new_ctx.liq.freeAsset -= parseInt(amount);
                }
                break;
            case 5:
                //WITHDRAW_USDC_FROM_AAVE
                if (amount === MAX_UINT_VALUE) {
                    new_ctx.liq.freeAsset += new_ctx.liq.collateralAsset;
                    new_ctx.liq.collateralAsset = 0;
                } else {
                    new_ctx.liq.freeAsset += parseInt(amount);
                    new_ctx.liq.collateralAsset -= parseInt(amount);
                }
                break;
            case 6:
                //BORROW_WMATIC_FROM_AAVE
                if (amount === MAX_UINT_VALUE) {
                    new_ctx.liq.freeToken += new_ctx.liq.borrowToken;
                    new_ctx.liq.borrowToken = 0;
                } else {
                    new_ctx.liq.freeToken += parseInt(amount);
                    new_ctx.liq.borrowToken += parseInt(amount);
                }
                break;
            case 7:
                //REPAY_WMATIC_TO_AAVE
                if (amount === MAX_UINT_VALUE) {
                    new_ctx.liq.borrowToken -= new_ctx.liq.freeToken;
                    new_ctx.liq.freeToken = 0;
                } else {
                    new_ctx.liq.borrowToken -= parseInt(amount);
                    new_ctx.liq.freeToken -= parseInt(amount);
                }
                break;
            case 8:
                //SWAP_WMATIC_TO_USDC
                if (amount === MAX_UINT_VALUE) {
                    new_ctx.liq.freeAsset += Math.floor(new_ctx.liq.freeToken / 10000 * (10000 - new_ctx.tokenAssetSlippagePercent));
                    new_ctx.liq.freeToken = 0;
                } else {
                    new_ctx.liq.freeAsset += Math.floor(parseInt(amount) / 10000 * (10000 - new_ctx.tokenAssetSlippagePercent));
                    new_ctx.liq.freeToken -= parseInt(amount);
                }
                break;
            case 9:
                //SWAP_USDC_TO_WMATIC
                if (amount === MAX_UINT_VALUE) {
                    new_ctx.liq.freeToken += Math.floor(new_ctx.liq.freeAsset / 10000 * (10000 - new_ctx.tokenAssetSlippagePercent));
                    new_ctx.liq.freeAsset = 0;
                } else {
                    new_ctx.liq.freeToken += Math.floor(parseInt(amount) / 10000 * (10000 - new_ctx.tokenAssetSlippagePercent));
                    new_ctx.liq.freeAsset -= parseInt(amount);
                }
                break;
            default:
                console.log("err case");
        }
    }

    new_ctx.amount = 0;
    return new_ctx;
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
