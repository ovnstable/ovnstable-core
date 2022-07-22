const {expect} = require("chai");
const chai = require("chai");
const {deployments, ethers, getNamedAccounts} = require('hardhat');
const BigNumber = require('bignumber.js');
const {toE6, fromE6, toE18, fromE18} = require("@overnight-contracts/common/utils/decimals");
const hre = require("hardhat");
const {resetHardhat} = require("@overnight-contracts/common/utils/tests");
let {DEFAULT} = require('@overnight-contracts/common/utils/assets');
const {evmCheckpoint, evmRestore, sharedBeforeEach} = require("@overnight-contracts/common/utils/sharedBeforeEach");
const expectRevert = require("@overnight-contracts/common/utils/expectRevert");
const {ZERO_ADDRESS} = require("@openzeppelin/test-helpers/src/constants");
chai.use(require('chai-bignumber')());

describe("Payout", function () {

    let exchange;
    let usdPlus;
    let account;
    let pm;
    let m2m;
    let mockPL;

    let asset;
    let toAsset = function() {};
    let fromAsset = function() {};


    sharedBeforeEach('deploy', async () => {
        // need to run inside IDEA via node script running
        await hre.run("compile");
        await resetHardhat(process.env.STAND);

        await deployments.fixture(['setting', 'base', 'test', 'MockStrategies', 'MockPayoutListener']);

        const {deployer} = await getNamedAccounts();
        account = deployer;
        exchange = await ethers.getContract("Exchange");
        usdPlus = await ethers.getContract("UsdPlusToken");
        pm = await ethers.getContract("PortfolioManager");
        m2m = await ethers.getContract("Mark2Market");
        mockPL = await ethers.getContract("MockPayoutListener");

        await exchange.setBuyFee(25, 100000);

        if (process.env.STAND === 'bsc') {
            asset = await ethers.getContractAt("ERC20", DEFAULT.busd);
            toAsset = toE18;
            fromAsset = fromE18;
        } else {
            asset = await ethers.getContractAt("ERC20", DEFAULT.usdc);
            toAsset = toE6;
            fromAsset = fromE6;
        }
    });


    it("Mint, Payout should increase liq index", async function () {

        // unset PL if was set on deploy stage
        await (await exchange.setPayoutListener(ZERO_ADDRESS)).wait();

        const sum = toAsset(100000);
        await (await asset.approve(exchange.address, sum)).wait();
        await (await exchange.buy(asset.address, sum)).wait();

        let totalNetAssets = new BigNumber(fromAsset((await m2m.totalNetAssets()).toString()));
        let totalLiqAssets = new BigNumber(fromAsset((await m2m.totalLiquidationAssets()).toString()));
        let liquidationIndex = await usdPlus.liquidityIndex();
        let balanceUsdPlusUser = fromE6(await usdPlus.balanceOf(account));

        // wait 1 days
        const days = 1 * 24 * 60 * 60;
        await ethers.provider.send("evm_increaseTime", [days])
        await ethers.provider.send('evm_mine');

        let receipt = await (await exchange.payout()).wait();
        console.log(`Payout: gas used: ${receipt.gasUsed}`);

        let totalNetAssetsNew = new BigNumber(fromAsset((await m2m.totalNetAssets()).toString()));
        let totalLiqAssetsNew = new BigNumber(fromAsset((await m2m.totalLiquidationAssets()).toString()));
        let liquidationIndexNew = await usdPlus.liquidityIndex();
        let balanceUsdPlusUserNew = fromE6(await usdPlus.balanceOf(account));

        console.log(`Total net assets ${totalNetAssets.toFixed()}->${totalNetAssetsNew.toFixed()}`);
        console.log(`Total liq assets ${totalLiqAssets.toFixed()}->${totalLiqAssetsNew.toFixed()}`);
        console.log(`Liq index ${liquidationIndex}->${liquidationIndexNew}`);
        console.log(`Balance usd+ ${balanceUsdPlusUser}->${balanceUsdPlusUserNew}`);

        expect(liquidationIndexNew.toString()).to.not.eq(liquidationIndex.toString());
        expect(totalNetAssetsNew.gte(totalNetAssets)).to.equal(true);
        expect(totalLiqAssetsNew.gte(totalLiqAssets)).to.equal(true);
        expect(balanceUsdPlusUserNew).to.greaterThan(balanceUsdPlusUser);
    });

    it("Call payout with PayoutListener", async function () {

        // unset PL if was set on deploy stage
        await (await exchange.setPayoutListener(ZERO_ADDRESS)).wait();

        const sum = toAsset(100000);
        await (await asset.approve(exchange.address, sum)).wait();
        await (await exchange.buy(asset.address, sum)).wait();

        // wait 1 days
        const days = 1 * 24 * 60 * 60;
        await ethers.provider.send("evm_increaseTime", [days])
        await ethers.provider.send('evm_mine');

        // when not set mock PL payout should pass ok
        evmCheckpoint('before_payout');
        let payoutReceipt = await (await exchange.payout()).wait();
        const payoutEvent = payoutReceipt.events.find((e) => e.event === 'PayoutEvent');
        expect(payoutEvent).to.not.be.undefined;
        evmRestore('before_payout');

        let receipt = await (await exchange.setPayoutListener(mockPL.address)).wait();
        const updatedEvent = receipt.events.find((e) => e.event === 'PayoutListenerUpdated');
        expect(updatedEvent.args[0]).to.equals(mockPL.address);

        await expectRevert(mockPL.payoutDone(), 'MockPayoutListener.payoutDone() called');
        await expectRevert(exchange.payout(), 'MockPayoutListener.payoutDone() called');
    });

});
