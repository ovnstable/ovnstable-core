const hre = require("hardhat");
const {deployments, getNamedAccounts, ethers} = require("hardhat");
const BigNumber = require('bignumber.js');
const {expect} = require("chai");
const chai = require("chai");
chai.use(require('chai-bignumber')());
const {resetHardhat, greatLess} = require("@overnight-contracts/common/utils/tests");
const {toE6, toE18, fromAsset} = require("@overnight-contracts/common/utils/decimals");
const {sharedBeforeEach} = require("@overnight-contracts/common/utils/sharedBeforeEach");
const {transferAsset, getERC20, transferETH, initWallet} = require("@overnight-contracts/common/utils/script-utils");
const {POLYGON} = require('@overnight-contracts/common/utils/assets');


describe("FlashAttackStrategy", function () {

    describe(`Attack`, function () {

        let recipient;
        let strategy;
        let attackStrategy;
        let asset;
        let attackAsset;
        let toAsset = function() {};

        let VALUE;
        let DELTA;

        sharedBeforeEach("deploy", async () => {

            let values = await setUp('POLYGON', 'usdc');

            recipient = values.recipient;
            strategy = values.strategy;
            attackStrategy = values.attackStrategy;
            asset = values.asset;
            attackAsset = values.attackAsset;;
            toAsset = values.toAsset;

            let attackAmount = 1000000;
            let percentAmount = 1000;
            let putAmount = 1000;
            let deltaPercent = 0.1;

            let attackValue = toAsset(attackAmount);
            let assetValue = toAsset(putAmount);
            VALUE = new BigNumber(assetValue);
            DELTA = VALUE.times(new BigNumber(deltaPercent)).div(100);

            await (await strategy.grantRole(await strategy.PORTFOLIO_MANAGER(), attackStrategy.address)).wait();
            await asset.transfer(attackStrategy.address, toAsset(putAmount + percentAmount + putAmount));
            await attackStrategy.setStrategy(strategy.address);
            await attackStrategy.flashLoanSimple(attackAsset, attackValue, assetValue);

        });

        it(`Test`, async function () {
            expect(VALUE.toNumber()).to.greaterThan(0);
        });

    });

});

async function setUp(network, assetName) {

    await hre.run("compile");
    await resetHardhat(network);

    let strategyName = process.env.TEST_STRATEGY;
    let flashAttackName = process.env.TEST_STRATEGY.replace('Strategy', 'FlashAttack');

    hre.ovn = {
        setting: true,
        noDeploy: false,
        tags: strategyName
    }

    await deployments.fixture([flashAttackName, strategyName]);

    const signers = await ethers.getSigners();
    const account = signers[0];
    const recipient = signers[1];

    const strategy = await ethers.getContract(strategyName);
    await strategy.setPortfolioManager(recipient.address);

    const attackStrategy = await ethers.getContract(flashAttackName);

    let mainAddress = (await initWallet()).address;
    await transferETH(100, mainAddress);

    const asset = await getERC20(assetName);
    await transferAsset(asset.address, mainAddress);
    console.log(`Balance [${assetName}]: [${fromAsset(await asset.balanceOf(mainAddress))}]`);

    let attackAsset;
    if (strategyName === 'StrategyUniV3DaiUsdt') {
        attackAsset = POLYGON.usdt;
    } else {
        attackAsset = asset.address;
    }

    let decimals = await asset.decimals();
    let toAsset;
    if (decimals === 18) {
        toAsset = toE18;
    } else {
        toAsset = toE6;
    }

    return {
        recipient: recipient,
        strategy: strategy,
        attackStrategy: attackStrategy,
        asset: asset,
        attackAsset: attackAsset,
        toAsset: toAsset,
    }
}
