const {expect} = require("chai");
const {deployments, ethers, getNamedAccounts} = require("hardhat");
const BN = require("bn.js");
const {constants} = require('@openzeppelin/test-helpers');
const {ZERO_ADDRESS} = constants;
const hre = require("hardhat");
const expectRevert = require("@overnight-contracts/common/utils/expectRevert");
let {POLYGON} = require('@overnight-contracts/common/utils/assets');
const {sharedBeforeEach} = require("@overnight-contracts/common/utils/sharedBeforeEach");


describe("WrappedUsdPlusToken", function () {

    let account;
    let secondAccount;
    let usdPlus;
    let wrappedUsdPlus;
    let usdc;
    let market;


    sharedBeforeEach('deploy and setup', async () => {
        // need to run inside IDEA via node script running
        await hre.run("compile");

        await deployments.fixture(['test', 'base', 'setting']);

        const {deployer} = await getNamedAccounts();
        account = deployer;
        const signers = await ethers.getSigners();
        secondAccount = signers[1];

        usdPlus = await ethers.getContract("MockUsdPlusToken");
        wrappedUsdPlus = await ethers.getContract("WrappedUsdPlusToken");
        usdc = await ethers.getContractAt("ERC20", POLYGON.usdc);
        market = await ethers.getContract("Market");

    });


    it("asset token is usd+", async function () {

        let assetToken = await wrappedUsdPlus.asset();
        expect(assetToken.toString()).to.equals(usdPlus.address);

    });

    it("rate same to usdPlus liquidity index", async function () {

        let liquidityIndex = new BN(10).pow(new BN(27)); // 10^27
        await usdPlus.setLiquidityIndex(liquidityIndex.toString());
        let rate = await wrappedUsdPlus.rate();
        expect(rate.toString()).to.equals(liquidityIndex.toString());

        liquidityIndex = liquidityIndex.subn(1000)
        await usdPlus.setLiquidityIndex(liquidityIndex.toString());
        rate = await wrappedUsdPlus.rate();
        expect(rate.toString()).to.equals(liquidityIndex.toString());

    });


    it("static to dynamic converting", async function () {

        let liquidityIndex = new BN(10).pow(new BN(27)); // 10^27
        await usdPlus.setLiquidityIndex(liquidityIndex.toString());

        let staticAmount = 1000;
        let dynamicAmount = await wrappedUsdPlus.convertToAssets(staticAmount);
        expect(dynamicAmount).to.equals(staticAmount);

        liquidityIndex = new BN(10).pow(new BN(27)).divn(2); // 5*10^26
        await usdPlus.setLiquidityIndex(liquidityIndex.toString());

        dynamicAmount = await wrappedUsdPlus.convertToAssets(staticAmount);
        expect(dynamicAmount).to.equals(500);

        liquidityIndex = new BN(10).pow(new BN(27)).muln(2); // 2*10^27
        await usdPlus.setLiquidityIndex(liquidityIndex.toString());

        dynamicAmount = await wrappedUsdPlus.convertToAssets(staticAmount);
        expect(dynamicAmount).to.equals(2000);

    });

    it("dynamic to static converting", async function () {

        let liquidityIndex = new BN(10).pow(new BN(27)); // 10^27
        await usdPlus.setLiquidityIndex(liquidityIndex.toString());

        let staticAmount = 1000;
        let dynamicAmount = await wrappedUsdPlus.convertToShares(staticAmount);
        expect(dynamicAmount).to.equals(staticAmount);

        liquidityIndex = new BN(10).pow(new BN(27)).divn(2); // 5*10^26
        await usdPlus.setLiquidityIndex(liquidityIndex.toString());

        dynamicAmount = await wrappedUsdPlus.convertToShares(staticAmount);
        expect(dynamicAmount).to.equals(2000);

        liquidityIndex = new BN(10).pow(new BN(27)).muln(2); // 2*10^27
        await usdPlus.setLiquidityIndex(liquidityIndex.toString());

        dynamicAmount = await wrappedUsdPlus.convertToShares(staticAmount);
        expect(dynamicAmount).to.equals(500);

    });

    it("dynamic<->static converting", async function () {

        let liquidityIndex = new BN(10).pow(new BN(27)); // 10^27
        await usdPlus.setLiquidityIndex(liquidityIndex.toString());

        let staticAmount = 1000;
        let dynamicAmount = await wrappedUsdPlus.convertToShares(staticAmount);
        let newStaticAmount = await wrappedUsdPlus.convertToAssets(dynamicAmount);
        expect(newStaticAmount).to.equals(staticAmount);

        liquidityIndex = new BN(10).pow(new BN(27)).divn(2); // 5*10^26
        await usdPlus.setLiquidityIndex(liquidityIndex.toString());

        dynamicAmount = await wrappedUsdPlus.convertToShares(staticAmount);
        newStaticAmount = await wrappedUsdPlus.convertToAssets(dynamicAmount);
        expect(newStaticAmount).to.equals(staticAmount);

        liquidityIndex = new BN(10).pow(new BN(27)).muln(2); // 2*10^27
        await usdPlus.setLiquidityIndex(liquidityIndex.toString());

        dynamicAmount = await wrappedUsdPlus.convertToShares(staticAmount);
        newStaticAmount = await wrappedUsdPlus.convertToAssets(dynamicAmount);
        expect(newStaticAmount).to.equals(staticAmount);

    });


    it("dynamic balance", async function () {

        let liquidityIndex = new BN(10).pow(new BN(27)).muln(2); // 2*10^27
        await usdPlus.setLiquidityIndex(liquidityIndex.toString());

        let usdPlusAmountToWrap = 250;
        let usdcAmountToDeposit = 1000;
        // 500 USD+ minted with liquidityIndex = 2*10^27
        await usdPlus.mint(account, usdcAmountToDeposit);

        await usdPlus.approve(wrappedUsdPlus.address, usdPlusAmountToWrap);

        // call again to change state
        await wrappedUsdPlus.deposit(usdPlusAmountToWrap, account);

        expect(await wrappedUsdPlus.balanceOf(account)).to.equals(usdPlusAmountToWrap / 2);
        expect(await wrappedUsdPlus.maxWithdraw(account)).to.equals(usdPlusAmountToWrap);

    });

    it("deposit 1:1", async function () {
        let liquidityIndex = new BN(10).pow(new BN(27)); // 10^27
        await usdPlus.setLiquidityIndex(liquidityIndex.toString());

        await expectRevert(
            wrappedUsdPlus.callStatic.deposit(1, ZERO_ADDRESS),
            'Zero address for receiver not allowed',
        );

        await expectRevert(
            wrappedUsdPlus.callStatic.deposit(0, account),
            'Zero assets not allowed',
        );

        let usdcAmountToDeposit = 250;

        await expectRevert(
            wrappedUsdPlus.callStatic.deposit(usdcAmountToDeposit, account),
            'ERC20: transfer amount exceeds balance',
        );

        expect(await usdPlus.balanceOf(wrappedUsdPlus.address)).to.equals(0);
        expect(await usdPlus.balanceOf(account)).to.equals(0);
        expect(await wrappedUsdPlus.balanceOf(account)).to.equals(0);

        await usdPlus.mint(account, usdcAmountToDeposit);
        await usdPlus.approve(wrappedUsdPlus.address, usdcAmountToDeposit);

        // callStatic doesn't change state but return value
        let mintedStaticAmount = await wrappedUsdPlus.callStatic.deposit(usdcAmountToDeposit, account);
        expect(mintedStaticAmount.toString()).to.equals(String(usdcAmountToDeposit));

        // call again to change state
        let receipt = await (await wrappedUsdPlus.deposit(usdcAmountToDeposit, account)).wait();

        const depositEvent = receipt.events.find((e) => e.event === 'Deposit' && e.args[0] === account);
        expect(depositEvent.args[3].toString()).to.equals(String(mintedStaticAmount));

        expect(await usdPlus.balanceOf(wrappedUsdPlus.address)).to.equals(usdcAmountToDeposit);
        expect(await usdPlus.balanceOf(account)).to.equals(0);
        expect(await wrappedUsdPlus.balanceOf(account)).to.equals(mintedStaticAmount);

    });

    it("redeem 1:1", async function () {

        let liquidityIndex = new BN(10).pow(new BN(27)); // 10^27
        await usdPlus.setLiquidityIndex(liquidityIndex.toString());


        await expectRevert(
            wrappedUsdPlus.callStatic.redeem(1, ZERO_ADDRESS, account),
            'Zero address for receiver not allowed',
        );

        await expectRevert(
            wrappedUsdPlus.callStatic.redeem(1, account, ZERO_ADDRESS),
            'Zero address for owner not allowed',
        );

        await expectRevert(
            wrappedUsdPlus.callStatic.redeem(0, account, account),
            'Zero shares not allowed',
        );

        let usdcAmountToDeposit = 250;

        expect(await usdPlus.balanceOf(wrappedUsdPlus.address)).to.equals(0);
        expect(await usdPlus.balanceOf(account)).to.equals(0);
        expect(await wrappedUsdPlus.balanceOf(account)).to.equals(0);

        await usdPlus.mint(account, usdcAmountToDeposit);
        await usdPlus.approve(wrappedUsdPlus.address, usdcAmountToDeposit);

        // callStatic doesn't change state but return value
        let mintedStaticAmount = await wrappedUsdPlus.callStatic.deposit(usdcAmountToDeposit, account);
        expect(mintedStaticAmount.toString()).to.equals(String(usdcAmountToDeposit));

        // call again to change state
        await (await wrappedUsdPlus.deposit(usdcAmountToDeposit, account)).wait();

        expect(await usdPlus.balanceOf(wrappedUsdPlus.address)).to.equals(usdcAmountToDeposit);
        expect(await usdPlus.balanceOf(account)).to.equals(0);
        expect(await wrappedUsdPlus.balanceOf(account)).to.equals(mintedStaticAmount);

        // callStatic doesn't change state but return value
        let transferredDynamicAmount = await wrappedUsdPlus.callStatic.redeem(usdcAmountToDeposit, account, account);
        expect(transferredDynamicAmount.toString()).to.equals(String(usdcAmountToDeposit));

        let usdPlusBalanceBefore = await usdPlus.balanceOf(account);

        // call again to change state
        let receipt = await (await wrappedUsdPlus.redeem(usdcAmountToDeposit, account, account)).wait();

        const depositEvent = receipt.events.find((e) => e.event === 'Withdraw' && e.args[0] === account);
        expect(depositEvent.args[3].toString()).to.equals(String(transferredDynamicAmount));

        expect(await usdPlus.balanceOf(wrappedUsdPlus.address)).to.equals(0);
        expect(await wrappedUsdPlus.balanceOf(account)).to.equals(0);

        expect((await usdPlus.balanceOf(account)).toString()).to.equals(
            new BN(usdPlusBalanceBefore.toString())
                .add(new BN(transferredDynamicAmount.toString()))
                .toString()
        );

    });


    it("redeem another owner", async function () {
        const [owner, tmpUser] = await ethers.getSigners();

        let liquidityIndex = new BN(10).pow(new BN(27)); // 10^27
        await usdPlus.setLiquidityIndex(liquidityIndex.toString());

        let usdcAmountToDeposit = 250;
        await expectRevert(
            wrappedUsdPlus.callStatic.redeem(usdcAmountToDeposit, account, tmpUser.address),
            'Redeem amount exceeds allowance',
        );

        await usdPlus.mint(account, usdcAmountToDeposit);
        await usdPlus.approve(wrappedUsdPlus.address, usdcAmountToDeposit);

        // call again to change state
        await (await wrappedUsdPlus.deposit(usdcAmountToDeposit, tmpUser.address)).wait();

        expect(await usdPlus.balanceOf(wrappedUsdPlus.address)).to.equals(usdcAmountToDeposit);
        expect(await usdPlus.balanceOf(account)).to.equals(0);
        expect(await wrappedUsdPlus.balanceOf(tmpUser.address)).to.equals(usdcAmountToDeposit);

        await wrappedUsdPlus.connect(tmpUser).approve(account, usdcAmountToDeposit);
        expect(await wrappedUsdPlus.allowance(tmpUser.address, account)).to.equals(usdcAmountToDeposit);

        // callStatic doesn't change state but return value
        let transferredDynamicAmount = await wrappedUsdPlus.callStatic.redeem(usdcAmountToDeposit, account, tmpUser.address);
        expect(transferredDynamicAmount.toString()).to.equals(String(usdcAmountToDeposit));

        let usdPlusBalanceBefore = await usdPlus.balanceOf(account);

        // call again to change state
        let receipt = await (await wrappedUsdPlus.redeem(usdcAmountToDeposit, account, tmpUser.address)).wait();

        expect(await usdPlus.balanceOf(wrappedUsdPlus.address)).to.equals(0);
        expect(await wrappedUsdPlus.balanceOf(account)).to.equals(0);
        expect(await wrappedUsdPlus.balanceOf(tmpUser.address)).to.equals(0);
        expect(await wrappedUsdPlus.allowance(tmpUser.address, account)).to.equals(0);

        expect((await usdPlus.balanceOf(account)).toString()).to.equals(
            new BN(usdPlusBalanceBefore.toString())
                .add(new BN(transferredDynamicAmount.toString()))
                .toString()
        );

    });


    it("totalAssets", async function () {

        let liquidityIndex = new BN(10).pow(new BN(27)); // 10^27
        await usdPlus.setLiquidityIndex(liquidityIndex.toString());

        let usdcAmountToDeposit = 250;

        expect(await wrappedUsdPlus.totalAssets()).to.equals(0);
        expect(await wrappedUsdPlus.maxWithdraw(account)).to.equals(0);

        await usdPlus.mint(account, usdcAmountToDeposit);
        await usdPlus.approve(wrappedUsdPlus.address, usdcAmountToDeposit);

        let mintedStaticAmount = await wrappedUsdPlus.callStatic.deposit(usdcAmountToDeposit, account);
        await wrappedUsdPlus.deposit(usdcAmountToDeposit, account);

        expect(await wrappedUsdPlus.balanceOf(account)).to.equals(mintedStaticAmount);
        expect(await wrappedUsdPlus.totalAssets()).to.equals(usdcAmountToDeposit);

    });


    it("maxWithdraw", async function () {

        let liquidityIndex = new BN(10).pow(new BN(27)); // 10^27
        await usdPlus.setLiquidityIndex(liquidityIndex.toString());

        let usdcAmountToDeposit = 250;

        expect(await wrappedUsdPlus.totalAssets()).to.equals(0);
        expect(await wrappedUsdPlus.maxWithdraw(account)).to.equals(0);

        await usdPlus.mint(account, usdcAmountToDeposit);
        await usdPlus.approve(wrappedUsdPlus.address, usdcAmountToDeposit);

        // call again to change state
        await wrappedUsdPlus.deposit(usdcAmountToDeposit, account);

        expect(await wrappedUsdPlus.totalAssets()).to.equals(usdcAmountToDeposit);
        expect(await wrappedUsdPlus.maxWithdraw(account)).to.equals(usdcAmountToDeposit);

    });

/*
    it("market test", async function () {

        await usdc.transfer(secondAccount.address, 100000000);

        expect(await usdc.balanceOf(secondAccount.address)).to.equals(100000000);
        expect(await wrappedUsdPlus.balanceOf(secondAccount.address)).to.equals(0);
        await usdc.connect(secondAccount).approve(market.address, 100000000);
        await market.connect(secondAccount).wrap(usdc.address, 100000000, secondAccount.address);
        expect(await wrappedUsdPlus.balanceOf(secondAccount.address)).to.equals(95637103);
        expect(await usdc.balanceOf(secondAccount.address)).to.equals(0);

        await wrappedUsdPlus.connect(secondAccount).approve(market.address, 95637103);
        await market.connect(secondAccount).unwrap(usdc.address, 95637103, secondAccount.address);
        expect(await wrappedUsdPlus.balanceOf(secondAccount.address)).to.equals(0);
        expect(await usdc.balanceOf(secondAccount.address)).to.equals(99920016);
    });
*/
});




