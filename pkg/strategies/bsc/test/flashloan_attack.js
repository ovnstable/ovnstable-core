const hre = require("hardhat");
const {deployments, getNamedAccounts, ethers} = require("hardhat");
const {resetHardhat, greatLess} = require("@overnight-contracts/common/utils/tests");
const {toE6, toE18, fromAsset, fromE18, fromE6} = require("@overnight-contracts/common/utils/decimals");
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

const formatter = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',

    // These options are needed to round to whole numbers if that's what you want.
    //minimumFractionDigits: 0, // (this suffices for whole numbers, but will print 2500.10 as $2,500.1)
    maximumFractionDigits: 0, // (causes 2500.99 to be printed as $2,501)
});

describe("FlashLoanAttackStrategy", function () {

    describe(`Stake`, function () {

        let recipient;
        let strategy;
        let attackStrategy;
        let asset;
        let toAsset = function() {};
        let fromAsset = function() {};
        let log = [];

        sharedBeforeEach("deploy", async () => {

            let values = await setUp('BSC', 'busd');

            recipient = values.recipient;
            strategy = values.strategy;
            attackStrategy = values.attackStrategy;
            asset = values.asset;
            toAsset = values.toAsset;
            fromAsset = values.fromAsset;

            let attackValue = toAsset(50_000_000);
            let assetValue = toAsset(1_000_000);


            await asset.transfer(strategy.address, assetValue);
            await strategy.connect(recipient).stake(asset.address, assetValue);
            makeLog('Stake to strategy', assetValue, (await strategy.netAssetValue()).toString());

            let usdc = await getERC20("usdc");
            await usdc.transfer(attackStrategy.address, attackValue);
            await attackStrategy.connect(recipient).flashAttack(usdc.address, attackValue, 1);
            makeLog('Attack to strategy', attackValue, (await strategy.netAssetValue()).toString());


            await asset.transfer(strategy.address, assetValue);
            await strategy.connect(recipient).stake(asset.address, assetValue);
            makeLog('Stake to strategy', assetValue, (await strategy.netAssetValue()).toString());


            await strategy.connect(recipient).unstake(asset.address, 0, recipient.address, true);
            makeLog('Unstake full from strategy', (await strategy.netAssetValue()).toString(), (await asset.balanceOf(recipient.address)).toString());

            showLog();
        });

        it(`Test`, async function () {
            expect(1).to.greaterThan(0);
        });


        function makeLog(step, amount, nav){

            nav = new BigNumber(nav);
            amount = new BigNumber(amount);

            let diff;
            if(log.length > 0){
                diff = nav.minus(log[log.length-1].nav)
            }else {
                diff = new BigNumber("0");
            }

            log.push({
                step: step,
                amount: amount,
                nav: nav,
                diff: diff
            });
        }

        function showLog(){

            let tables = [];

            log.forEach(value => {

                tables.push({
                    step: value.step,
                    amount: formatter.format(fromAsset(value.amount.toString())),
                    nav: formatter.format(fromAsset(value.nav.toString())),
                    diff: formatter.format(fromAsset(value.diff.toString())),
                })
            })

            console.table(tables);
        }

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

    let decimals = await asset.decimals();

    let toAsset;
    let fromAsset;
    if (decimals === 18) {
        toAsset = toE18;
        fromAsset = fromE18;
    } else {
        toAsset = toE6;
        fromAsset = fromE6;
    }

    console.log(`Balance [${assetName}]: [${fromAsset(await asset.balanceOf(mainAddress))}]`);

    await getAssetAmount(mainAddress, "usdc", account);
    const usdc = await getERC20("usdc");
    console.log(`Balance [usdc]: [${fromAsset(await usdc.balanceOf(mainAddress))}]`);


    return {
        recipient: recipient,
        asset: asset,
        strategy: strategy,
        toAsset: toAsset,
        fromAsset: fromAsset,
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
