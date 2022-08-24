const hre = require("hardhat");
const {deployments, ethers} = require("hardhat");
const {resetHardhat} = require("@overnight-contracts/common/utils/tests");
const {toE6, toE18, fromAsset} = require("@overnight-contracts/common/utils/decimals");
const {expect} = require("chai");
const {
    sharedBeforeEach
} = require("@overnight-contracts/common/utils/sharedBeforeEach");
const BigNumber = require('bignumber.js');
const chai = require("chai");
chai.use(require('chai-bignumber')());

const {waffle} = require("hardhat");
const {getContract, execTimelock, getERC20, initWallet} = require("@overnight-contracts/common/utils/script-utils");
const {transferETH, transferUSDPlus} = require("@overnight-contracts/common/utils/script-utils");
const {provider} = waffle;


function strategyTest(strategyParams, network, assetAddress, runStrategyLogic) {

    let values = [
        {
            value: 2000,
            deltaPercent: 1,
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

        let expectedHealthFactor = '1350000000000000000';
        let healthFactorDELTA = '10000000000000000';

        sharedBeforeEach("deploy", async () => {
            await hre.run("compile");
            hre.ethers.provider = new hre.ethers.providers.JsonRpcProvider('http://localhost:8545')
            const signers = await ethers.getSigners();
            account = signers[0];
            recipient = provider.createEmptyWallet();

            await transferETH(10, recipient.address);
            await transferETH(10, account.address);
            await transferETH(10, (await initWallet()).address);
            await transferUSDPlus(1000, account.address);

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
                        // let balances = await strategy.balances();
                        // console.log(`balances before:\n${JSON.stringify(balances, null, 2)}`)

                        await m2m(strategy);

                        let assetValue = toAsset(stakeValue);
                        VALUE = new BigNumber(assetValue);
                        DELTA = VALUE.multipliedBy(new BigNumber(deltaPercent)).div(100);

                        await asset.connect(account).transfer(recipient.address, assetValue);

                        let balanceAssetBefore = new BigNumber((await asset.balanceOf(recipient.address)).toString());
                        expectedNetAsset = new BigNumber((await strategy.netAssetValue()).toString()).plus(VALUE);

                        await asset.connect(recipient).transfer(strategy.address, assetValue);
                        await strategy.connect(recipient).currentLiquidity();
                        return;

                        await strategy.connect(recipient).stake(assetValue);

                        let balanceAssetAfter = new BigNumber((await asset.balanceOf(recipient.address)).toString());

                        balanceAsset = balanceAssetBefore.minus(balanceAssetAfter);
                        console.log(`----------------------`)
                        console.log(`balanceAssetAfter: ${balanceAssetAfter}`)
                        console.log(`balanceAsset: ${balanceAsset}`)
                        console.log(`netAssetValueCheck: ${netAssetValueCheck}`)
                        console.log(`----------------------`)
                        netAssetValueCheck = new BigNumber((await strategy.netAssetValue()).toString());
                        healthFactor = await strategy.currentHealthFactor();

                        // balances = await strategy.balances();
                        // console.log(`balances after:\n${JSON.stringify(balances, null, 2)}`)
                        await m2m(strategy);
                    } catch (e) {
                        console.log(e)
                        throw e;
                    }

                });

                it(`Balance asset is in range`, async function () {
                    greatLess(balanceAsset, VALUE, DELTA);
                });

                // it(`NetAssetValue asset is in range`, async function () {
                //     greatLess(netAssetValueCheck, expectedNetAsset, DELTA);
                // });

                // it(`Health Factor is in range`, async function () {
                //     greatLess(healthFactor, expectedHealthFactor, healthFactorDELTA);
                // });

                // describe(`UnStake ${unstakeValue}`, function () {

                //     let balanceAsset;
                //     let expectedNetAsset;
                //     let expectedLiquidation;

                //     let VALUE;
                //     let DELTA;

                //     let netAssetValueCheck;
                //     let healthFactor;

                //     sharedBeforeEach(`Unstake ${unstakeValue}`, async () => {

                //         await m2m(strategy);
                //         let assetValue = toAsset(unstakeValue);
                //         VALUE = new BigNumber(assetValue);
                //         DELTA = VALUE.times(new BigNumber(deltaPercent)).div(100);

                //         let balanceAssetBefore = new BigNumber((await asset.balanceOf(recipient.address)).toString());

                //         expectedNetAsset = new BigNumber((await strategy.netAssetValue()).toString()).minus(VALUE);
                //         // expectedLiquidation = new BigNumber((await strategy.liquidationValue()).toString()).minus(VALUE);

                //         await strategy.connect(recipient).unstake(assetValue, recipient.address);

                //         let balanceAssetAfter = new BigNumber((await asset.balanceOf(recipient.address)).toString());

                //         balanceAsset = balanceAssetAfter.minus(balanceAssetBefore);

                //         netAssetValueCheck = new BigNumber((await strategy.netAssetValue()).toString());
                //         healthFactor = await strategy.currentHealthFactor();

                //         await m2m(strategy);

                //     });

                //     it(`Balance asset is in range`, async function () {
                //         greatLess(balanceAsset, VALUE, DELTA);
                //     });

                //     it(`NetAssetValue asset is in range`, async function () {
                //         greatLess(netAssetValueCheck, expectedNetAsset, DELTA);
                //     });

                //     it(`Health Factor is in range`, async function () {
                //         greatLess(healthFactor, expectedHealthFactor, healthFactorDELTA);
                //     });

                // });

            });

        });

    });
}



async function m2m(strategy) {
    console.log('ETS:')

    let values = [];
    values.push({name: 'Total NAV', value: fromAsset(await strategy.netAssetValue())});
    values.push({name: 'HF', value: (await strategy.currentHealthFactor()).toString()});

    console.table(values);


    let items = await strategy.balances();

    let arrays = [];
    for (let i = 0; i < items.length; i++) {

        let item = items[i];

        arrays.push({
            name: item[0],
            amountUSD: fromAsset(item[1].toString()),
            //amount: fromE18(item[2].toString()),
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
