const {expect} = require("chai");
const {deployments, ethers, getNamedAccounts} = require("hardhat");
const BN = require("bn.js");
const hre = require("hardhat");
const expectRevert = require("@overnight-contracts/common/utils/expectRevert");
let {ARBITRUM} = require('@overnight-contracts/common/utils/assets');
const {sharedBeforeEach} = require("@overnight-contracts/common/utils/sharedBeforeEach");
const { ZERO_ADDRESS } = require("@openzeppelin/test-helpers/src/constants");


describe("PendleUsdPlusTokenSY", function () {

    let account;
    let usdPlus;
    let usdPlusSY;
    let usdc;
    let exchange;
    let koef;
    let usdcAmountToDeposit;
    let usdcAmountToDeposit2;
    let usdcAmountToDepositForFees;

    sharedBeforeEach('deploy and setup', async () => {

        await hre.run("compile");

        await deployments.fixture(['BuyonSwap', 'MockUsdPlusToken', 'MockExchange', 'PendleUsdPlusTokenSY']);

        const {deployer} = await getNamedAccounts();
        account = deployer;

        usdPlusSY = await ethers.getContract("PendleUsdPlusTokenSY");
        usdPlus = await ethers.getContract("MockUsdPlusToken");
        usdc = await ethers.getContractAt("IERC20", ARBITRUM.usdc);
        exchange = await ethers.getContract("MockExchange");
        koef = 10;
        usdcAmountToDeposit = 250;
        usdcAmountToDeposit2 = 500;
        usdcAmountToDepositForFees = 100000000;

        await usdPlus.setExchanger(exchange.address);
    });



    async function depositUsdPlus(usdcAmountToDeposit) {

        await expectRevert(
            usdPlusSY.callStatic.deposit(account, usdPlus.address, 0, 0),
            'SYZeroDeposit',
        );

        await expectRevert(
            usdPlusSY.callStatic.deposit(account, usdPlus.address, usdcAmountToDeposit, 0),
            'ERC20: transfer amount exceeds balance',
        );

        await expectRevert(
            usdPlusSY.callStatic.deposit(account, exchange.address, usdcAmountToDeposit, 0),
            'SYInvalidTokenIn',
        );

        await usdc.approve(exchange.address, usdcAmountToDeposit);
        await exchange.buy(usdc.address, usdcAmountToDeposit);
        let usdPlusBalance = await usdPlus.balanceOf(account);

        await expectRevert(
            usdPlusSY.callStatic.deposit(account, usdPlus.address, usdPlusBalance, 0),
            'UsdPlusToken: transfer amount exceeds allowance',
        );

        await usdPlus.approve(usdPlusSY.address, usdPlusBalance);
        let mintedWrappedAmount = await usdPlusSY.callStatic.deposit(account, usdPlus.address, usdPlusBalance, 0);
        expect(await usdPlusSY.previewDeposit(usdPlus.address, usdPlusBalance)).to.equals(mintedWrappedAmount);
        let receipt = await (await usdPlusSY.deposit(account, usdPlus.address, usdPlusBalance, 0)).wait();
        const depositEvent = receipt.events.find((e) => e.event === 'Deposit' && e.args[0] === account);
        expect(depositEvent.args[2].toString()).to.equals(String(usdPlus.address));
        expect(depositEvent.args[3].toString()).to.equals(String(usdPlusBalance));
        expect(depositEvent.args[4].toString()).to.equals(String(mintedWrappedAmount));

    }

    async function redeemUsdPlus(amountSharesToRedeem) {

        await expectRevert(
            usdPlusSY.callStatic.redeem(account, 0, usdPlus.address, 0, false),
            'SYZeroRedeem',
        );

        await expectRevert(
            usdPlusSY.callStatic.redeem(account, 200 * amountSharesToRedeem, usdPlus.address, 0, false),
            'ERC20: burn amount exceeds balance',
        );

        await expectRevert(
            usdPlusSY.callStatic.redeem(account, amountSharesToRedeem, exchange.address, 0, false),
            'SYInvalidTokenOut',
        );

        let redeemedUsdPlusAmount = await usdPlusSY.callStatic.redeem(account, amountSharesToRedeem, usdPlus.address, 0, false);
        expect(await usdPlusSY.previewRedeem(usdPlus.address, amountSharesToRedeem)).to.equals(redeemedUsdPlusAmount);
        let receipt = await (await usdPlusSY.redeem(account, amountSharesToRedeem, usdPlus.address, 0, false)).wait();
        const depositEvent = receipt.events.find((e) => e.event === 'Redeem' && e.args[0] === account);
        expect(depositEvent.args[2].toString()).to.equals(String(usdPlus.address));
        expect(depositEvent.args[3].toString()).to.equals(String(amountSharesToRedeem));
        expect(depositEvent.args[4].toString()).to.equals(String(redeemedUsdPlusAmount));

    }

    async function setLiquidityIndex(liquidityIndex) {

        await exchange.setLiquidityIndex(liquidityIndex.toString());
        expect((await usdPlusSY.exchangeRate()).toString()).to.equals(liquidityIndex.toString());

    }


    it("0. SY info", async function () {
        let assetInfo = await usdPlusSY.assetInfo();
        expect(assetInfo[1].toString()).to.equals(usdPlus.address);
        expect(assetInfo[2]).to.equals(6);
    });

    it("1. deposit usd+ --> liq up --> deposit usd+ --> liq down", async function () {

        await setLiquidityIndex(new BN(10).pow(new BN(27)));

        await depositUsdPlus(usdcAmountToDeposit);
        expect(await usdPlusSY.balanceOf(account)).to.equals(usdcAmountToDeposit);

        await setLiquidityIndex(new BN(10).pow(new BN(27)).muln(koef));
        expect(await usdPlusSY.balanceOf(account)).to.equals(usdcAmountToDeposit);

        await depositUsdPlus(usdcAmountToDeposit2);
        expect(await usdPlusSY.balanceOf(account)).to.equals(usdcAmountToDeposit + usdcAmountToDeposit2 / koef);

        await setLiquidityIndex(new BN(10).pow(new BN(27)).divn(koef));
        expect(await usdPlusSY.balanceOf(account)).to.equals(usdcAmountToDeposit + usdcAmountToDeposit2 / koef);

    });

    it("2. deposit usd+ --> liq down --> deposit usd+ --> liq up", async function () {

        await setLiquidityIndex(new BN(10).pow(new BN(27)));

        await depositUsdPlus(usdcAmountToDeposit);
        expect(await usdPlusSY.balanceOf(account)).to.equals(usdcAmountToDeposit);

        await setLiquidityIndex(new BN(10).pow(new BN(27)).divn(koef));
        expect(await usdPlusSY.balanceOf(account)).to.equals(usdcAmountToDeposit);

        await depositUsdPlus(usdcAmountToDeposit2);
        expect(await usdPlusSY.balanceOf(account)).to.equals(usdcAmountToDeposit + usdcAmountToDeposit2 * koef);

        await setLiquidityIndex(new BN(10).pow(new BN(27)).muln(koef));
        expect(await usdPlusSY.balanceOf(account)).to.equals(usdcAmountToDeposit + usdcAmountToDeposit2 * koef);

    });

    it("9. deposit usd+ --> redeem usd+", async function () {

        await setLiquidityIndex(new BN(10).pow(new BN(27)));

        await depositUsdPlus(usdcAmountToDeposit);
        expect(await usdPlusSY.balanceOf(account)).to.equals(usdcAmountToDeposit);

        await redeemUsdPlus(usdcAmountToDeposit / koef);
        expect(await usdPlus.balanceOf(account)).to.equals(usdcAmountToDeposit / koef);
        expect(await usdPlusSY.balanceOf(account)).to.equals(usdcAmountToDeposit / koef * (koef - 1));

    });

    it("11. deposit usd+ --> redeem usd+ all", async function () {

        await setLiquidityIndex(new BN(10).pow(new BN(27)));

        await depositUsdPlus(usdcAmountToDeposit);
        expect(await usdPlusSY.balanceOf(account)).to.equals(usdcAmountToDeposit);

        await redeemUsdPlus(usdcAmountToDeposit);
        expect(await usdPlus.balanceOf(account)).to.equals(usdcAmountToDeposit);
        expect(await usdPlusSY.balanceOf(account)).to.equals(0);

    });

});




