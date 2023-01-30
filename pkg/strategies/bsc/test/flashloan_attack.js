const hre = require("hardhat");
const {deployments, getNamedAccounts, ethers} = require("hardhat");
const {resetHardhat, greatLess} = require("@overnight-contracts/common/utils/tests");
const {toE6, toE18, fromAsset} = require("@overnight-contracts/common/utils/decimals");
const {sharedBeforeEach} = require("@overnight-contracts/common/utils/sharedBeforeEach");
const {transferDAI, getERC20, transferETH, initWallet} = require("@overnight-contracts/common/utils/script-utils");
const {expect} = require("chai");
const chai = require("chai");
const BigNumber = require('bignumber.js');
chai.use(require('chai-bignumber')());

hre.ovn = {
    setting: true,
    noDeploy: false
}

describe("FlashLoanAttackStrategy", function () {

    describe(`Stake`, function () {

        let recipient;
        let strategy;
        let attackStrategy;
        let asset;
        let toAsset = function() {};

        sharedBeforeEach("deploy", async () => {

            let values = await setUp('BSC', 'busd');

            recipient = values.recipient;
            strategy = values.strategy;
            attackStrategy = values.attackStrategy;
            asset = values.asset;
            toAsset = values.toAsset;

            let attackValue = toAsset(50000000);
            let assetValue = toAsset(1000000);

            await asset.transfer(strategy.address, assetValue);
            await strategy.connect(recipient).stake(asset.address, assetValue);

            let netAssetValueBeforeAttack = (await strategy.netAssetValue()).toString();
            console.log("netAssetValueBeforeAttack: " + netAssetValueBeforeAttack);

            let usdc = await getERC20("usdc");
            await usdc.transfer(attackStrategy.address, attackValue);
            await attackStrategy.connect(recipient).flashAttack(usdc.address, attackValue, 1);

            let netAssetValueAfterAttack = (await strategy.netAssetValue()).toString();
            console.log("netAssetValueAfterAttack: " + netAssetValueAfterAttack);

            await asset.transfer(strategy.address, assetValue);
            await strategy.connect(recipient).stake(asset.address, assetValue);

            let netAssetValueAfterStake = (await strategy.netAssetValue()).toString();
            console.log("netAssetValueAfterStake: " + netAssetValueAfterStake);

            await strategy.connect(recipient).unstake(asset.address, 0, recipient.address, true);

            let balanceAssetRecipient = (await asset.balanceOf(recipient.address)).toString();
            console.log("balanceAssetRecipient: " + balanceAssetRecipient);
        });

        it(`Test`, async function () {
            expect(1).to.greaterThan(0);
        });

    });

});

async function setUp(network, assetName) {

    await hre.run("compile");
    await resetHardhat(network);

    hre.ovn.tags = 'StrategyEllipsisDotDotBusd';
    hre.ovn.setting = true;

    await deployments.fixture(['FlashStrategyEllipsisDotDotBusd', 'StrategyEllipsisDotDotBusd', 'test']);

    const signers = await ethers.getSigners();
    const account = signers[0];
    const recipient = signers[1];

    const attackStrategy = await ethers.getContract('FlashStrategyEllipsisDotDotBusd');

    const strategy = await ethers.getContract('StrategyEllipsisDotDotBusd');
    await strategy.setPortfolioManager(recipient.address);

    let mainAddress = (await initWallet()).address;

    await transferETH(100, mainAddress);

    // Get amount asset for test
    await getAssetAmount(mainAddress, assetName, account);
    const asset = await getERC20(assetName);
    console.log(`Balance [${assetName}]: [${fromAsset(await asset.balanceOf(mainAddress))}]`);

    await getAssetAmount(mainAddress, "usdc", account);
    const usdc = await getERC20("usdc");
    console.log(`Balance [usdc]: [${fromAsset(await usdc.balanceOf(mainAddress))}]`);

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
