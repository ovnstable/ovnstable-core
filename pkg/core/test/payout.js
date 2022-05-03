const {expect} = require("chai");
const chai = require("chai");
const {deployments, ethers, getNamedAccounts} = require('hardhat');

const {toUSDC, fromUSDC} = require("@overnight-contracts/common/utils/decimals");
const hre = require("hardhat");
const {resetHardhat} = require("@overnight-contracts/common/utils/tests");
let {POLYGON} = require('@overnight-contracts/common/utils/assets');
const {evmCheckpoint, evmRestore} = require("@overnight-contracts/common/utils/sharedBeforeEach");
const {expectRevert} = require("@openzeppelin/test-helpers");
chai.use(require('chai-bignumber')());

describe("Payout", function () {


    let exchange;
    let usdPlus;
    let usdc;
    let account;
    let pm;
    let m2m;
    let mockPL;

    before(async () => {
        // need to run inside IDEA via node script running
        await hre.run("compile");
        await resetHardhat('polygon');

        await deployments.fixture(['setting', 'base', 'test', 'MockStrategies', 'MockPayoutListener']);

        const {deployer} = await getNamedAccounts();
        account = deployer;
        exchange = await ethers.getContract("Exchange");
        usdPlus = await ethers.getContract("UsdPlusToken");
        pm = await ethers.getContract("PortfolioManager");
        m2m = await ethers.getContract("Mark2Market");
        mockPL = await ethers.getContract("MockPayoutListener");

        usdc = await ethers.getContractAt("ERC20", POLYGON.usdc);
    });


    it("Mint, Payout should increase liq index", async function () {


        const sum = toUSDC(100000);
        await (await usdc.approve(exchange.address, sum)).wait();
        await (await exchange.buy(POLYGON.usdc, sum)).wait();

        let totalNetAssets = fromUSDC(await m2m.totalNetAssets());
        let totalLiqAssets = fromUSDC(await m2m.totalLiquidationAssets());
        let liquidationIndex = await usdPlus.liquidityIndex();
        let balanceUsdPlusUser = fromUSDC(await usdPlus.balanceOf(account));

        // wait 1 days
        const days = 1 * 24 * 60 * 60;
        await ethers.provider.send("evm_increaseTime", [days])
        await ethers.provider.send('evm_mine');

        let receipt = await (await exchange.payout()).wait();
        console.log(`Payout: gas used: ${receipt.gasUsed}`);

        let totalNetAssetsNew = fromUSDC(await m2m.totalNetAssets());
        let totalLiqAssetsNew = fromUSDC(await m2m.totalLiquidationAssets());
        let liquidationIndexNew = await usdPlus.liquidityIndex();
        let balanceUsdPlusUserNew = fromUSDC(await usdPlus.balanceOf(account));

        console.log(`Total net assets ${totalNetAssets}->${totalNetAssetsNew}`);
        console.log(`Total liq assets ${totalLiqAssets}->${totalLiqAssetsNew}`);
        console.log(`Liq index ${liquidationIndex}->${liquidationIndexNew}`);
        console.log(`Balance usd+ ${balanceUsdPlusUser}->${balanceUsdPlusUserNew}`);

        expect(liquidationIndexNew.toString()).to.not.eq(liquidationIndex.toString());

        // expect(totalNetAssetsNew).to.greaterThan(totalNetAssets); //TODO need to update
        // expect(totalLiqAssetsNew).to.greaterThan(totalLiqAssets);
        expect(balanceUsdPlusUserNew).to.greaterThan(balanceUsdPlusUser);
    });

    it("Call payout with PayoutListener", async function () {
        const sum = toUSDC(100000);
        await (await usdc.approve(exchange.address, sum)).wait();
        await (await exchange.buy(POLYGON.usdc, sum)).wait();

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
