const hre = require("hardhat");
const {deployments, getNamedAccounts, ethers} = require("hardhat");
const {resetHardhat, greatLess} = require("@overnight-contracts/common/utils/tests");
const {toE6, toE18, fromAsset} = require("@overnight-contracts/common/utils/decimals");
const {sharedBeforeEach} = require("@overnight-contracts/common/utils/sharedBeforeEach");
const {transferDAI, getERC20, transferETH, initWallet} = require("@overnight-contracts/common/utils/script-utils");
const {expect} = require("chai");
const chai = require("chai");
const BigNumber = require('bignumber.js');
const {POLYGON} = require("@overnight-contracts/common/utils/assets");
chai.use(require('chai-bignumber')());

hre.ovn = {
    setting: true,
    noDeploy: false
}

let attackAmount = 1_000_000;
let percentAmount = 10_000;
let putAmount = 10_000;
let deltaPercent = 0.1;


describe("FlashLoanAttackStrategy", function () {

    describe(`Stake`, function () {

        let recipient;
        let strategy;
        let attackStrategy;
        let asset;
        let toAsset = function() {};

        let VALUE;
        let DELTA;

        sharedBeforeEach("deploy", async () => {

            let values = await setUp('POLYGON', 'usdc');

            recipient = values.recipient;
            strategy = values.strategy;
            attackStrategy = values.attackStrategy;
            asset = values.asset;
            toAsset = values.toAsset;

            let attackValue = toAsset(attackAmount);
            let assetValue = toAsset(putAmount);
            VALUE = new BigNumber(assetValue);
            DELTA = VALUE.times(new BigNumber(deltaPercent)).div(100);

            await (await strategy.grantRole(await strategy.PORTFOLIO_MANAGER(), attackStrategy.address)).wait();

            await asset.transfer(attackStrategy.address, toAsset(putAmount + percentAmount + putAmount));
            await attackStrategy.setStrategy(strategy.address);
            await attackStrategy.flashLoanSimple(POLYGON.usdt, attackValue, assetValue);

        });

        it(`Test`, async function () {
            expect(VALUE.toNumber()).to.greaterThan(0);
        });

    });

});

async function setUp(network, assetName) {

    await hre.run("compile");
    await resetHardhat(network);

    hre.ovn.tags = 'StrategyUniV3DaiUsdt';
    hre.ovn.setting = true;

    await deployments.fixture(['FlashAttackUniV3', 'StrategyUniV3DaiUsdt', 'test']);

    const signers = await ethers.getSigners();
    const account = signers[0];
    const recipient = signers[1];

    const attackStrategy = await ethers.getContract('FlashAttackUniV3');

    const strategy = await ethers.getContract('StrategyUniV3DaiUsdt');
    await strategy.setPortfolioManager(recipient.address);

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
        attackStrategy: attackStrategy,
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

