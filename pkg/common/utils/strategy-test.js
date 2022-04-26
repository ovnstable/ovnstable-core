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

function greatLess(value, expected, delta) {

    let maxValue = expected.add(delta);
    let minValue = expected.sub(delta);

    let lte = value.lte(maxValue);
    let gte = value.gte(minValue);

    expect(gte).to.equal(true, `${value.toString()} less than ${maxValue.toString()}`);
    expect(lte).to.equal(true, `${value.toString()} greate than ${minValue.toString()}`);
}

function strategyTest(strategyName, network, assets) {

    let values = [0.002, 0.02, 0.2, 2, 20, 200, 2000, 20000, 200000, 2000000];

    describe(`${strategyName}`, function () {

        stakeUnstake(strategyName, network, assets, values);
        unstakeFull(strategyName, network, assets, values);
        claimRewards(strategyName, network, assets, values);

    });
}

module.exports = {
    strategyTest: strategyTest,
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

            const accounts = await getNamedAccounts();
            account = accounts.deployer;

            const signers = await ethers.getSigners();

            account = signers[0];
            recipient = signers[1];

            strategy = await ethers.getContract(strategyName);
            await strategy.setPortfolioManager(recipient.address);

            usdc = await ethers.getContractAt(ERC20, assets.usdc);
        });

        it("log gas", async () => {
            await logStrategyGasUsage(strategyName, strategy, usdc, account.address)
        });


        values.forEach(stakeValue => {

            let unstakeValue = stakeValue / 2;

            describe(`Stake ${stakeValue}`, function () {

                let balanceUsdc;
                let expectedNetAsset;
                let expectedLiquidation;

                let valueBN = new BN(toUSDC(stakeValue));
                let DELTA;
                if (valueBN > 10000) {
                    DELTA = valueBN.div(new BN(1000));
                } else {
                    DELTA = valueBN.div(new BN(2))
                }

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
                    let DELTA;
                    if (valueBN > 10000) {
                        DELTA = valueBN.div(new BN(1000));
                    } else {
                        DELTA = valueBN.div(new BN(2))
                    }

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

            const accounts = await getNamedAccounts();
            account = accounts.deployer;

            const signers = await ethers.getSigners();

            account = signers[0];
            recipient = signers[1];

            strategy = await ethers.getContract(strategyName);
            await strategy.setPortfolioManager(recipient.address);

            usdc = await ethers.getContractAt(ERC20, assets.usdc);
        });


        values.forEach(stakeValue => {

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

            const accounts = await getNamedAccounts();
            account = accounts.deployer;

            const signers = await ethers.getSigners();

            account = signers[0];
            recipient = signers[1];

            strategy = await ethers.getContract(strategyName);
            await strategy.setPortfolioManager(recipient.address);

            usdc = await ethers.getContractAt(ERC20, assets.usdc);
        });

        values.forEach(stakeValue => {

            describe(`Stake ${stakeValue} => ClaimRewards`, function () {

                let balanceUsdc;

                before(async () => {

                    await evmCheckpoint("default");

                    await usdc.transfer(recipient.address, toUSDC(stakeValue));

                    await usdc.connect(recipient).transfer(strategy.address, toUSDC(stakeValue));
                    await strategy.connect(recipient).stake(usdc.address, toUSDC(stakeValue));

                    const sevenDays = 7 * 24 * 60 * 60;
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
