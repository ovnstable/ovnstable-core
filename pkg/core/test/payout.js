const {expect} = require("chai");
const chai = require("chai");
const {deployments, ethers, getNamedAccounts} = require('hardhat');
const {smock} = require("@defi-wonderland/smock");

const {toUSDC, fromUSDC} = require("../../common/utils/decimals");
const hre = require("hardhat");
const {resetHardhat} = require("../../common/utils/tests");
let {POLYGON} = require('../../common/utils/assets');
chai.use(smock.matchers);
chai.use(require('chai-bignumber')());

describe("Payout", function () {


    let exchange;
    let usdPlus;
    let usdc;
    let account;
    let pm;
    let m2m;

    before(async () => {
        // need to run inside IDEA via node script running
        await hre.run("compile");
        await resetHardhat('polygon');

        await deployments.fixture(['setting', 'base', 'test']);

        const {deployer} = await getNamedAccounts();
        account = deployer;
        exchange = await ethers.getContract("Exchange");
        usdPlus = await ethers.getContract("UsdPlusToken");
        pm = await ethers.getContract("PortfolioManager");
        m2m = await ethers.getContract("Mark2Market");

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


});
