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
    let usdPlus;
    let wrappedUsdPlus;
    let usdc;


    sharedBeforeEach('deploy and setup', async () => {
        // need to run inside IDEA via node script running
        await hre.run("compile");

        await deployments.fixture(['MockUsdPlusToken', 'MockWrappedUsdPlusToken']);

        const {deployer} = await getNamedAccounts();
        account = deployer;

        usdPlus = await ethers.getContract("MockUsdPlusToken");
        wrappedUsdPlus = await ethers.getContract("WrappedUsdPlusToken");
        usdc = await ethers.getContractAt("ERC20", POLYGON.usdc);
    });


    it("asset token is usd+", async function () {
        let assetToken = await wrappedUsdPlus.asset();
        expect(assetToken.toString()).to.equals(usdPlus.address);
    });

    it("totalAssets", async function () {
        let liquidityIndex = new BN(10).pow(new BN(27)); // 10^27
        await usdPlus.setLiquidityIndex(liquidityIndex.toString());

        let usdcAmountToDeposit = 250;

        expect(await wrappedUsdPlus.totalAssets()).to.equals(0);
        expect(await wrappedUsdPlus.assetBalanceOf(account)).to.equals(0);

        await usdPlus.mint(account, usdcAmountToDeposit);
        await usdPlus.approve(wrappedUsdPlus.address, usdcAmountToDeposit);

        let mintedWrappedAmount = await wrappedUsdPlus.callStatic.deposit(usdcAmountToDeposit, account);
        await wrappedUsdPlus.deposit(usdcAmountToDeposit, account);

        expect(await wrappedUsdPlus.balanceOf(account)).to.equals(mintedWrappedAmount);
        expect(await wrappedUsdPlus.totalAssets()).to.equals(usdcAmountToDeposit);
    });

    it("wrapped to unwrapped converting", async function () {
        let liquidityIndex = new BN(10).pow(new BN(27)); // 10^27
        await usdPlus.setLiquidityIndex(liquidityIndex.toString());

        let wrappedAmount = 1000;
        let unwrappedAmount = await wrappedUsdPlus.convertToAssets(wrappedAmount);
        expect(unwrappedAmount).to.equals(wrappedAmount);

        liquidityIndex = new BN(10).pow(new BN(27)).divn(2); // 5*10^26
        await usdPlus.setLiquidityIndex(liquidityIndex.toString());

        unwrappedAmount = await wrappedUsdPlus.convertToAssets(wrappedAmount);
        expect(unwrappedAmount).to.equals(500);

        liquidityIndex = new BN(10).pow(new BN(27)).muln(2); // 2*10^27
        await usdPlus.setLiquidityIndex(liquidityIndex.toString());

        unwrappedAmount = await wrappedUsdPlus.convertToAssets(wrappedAmount);
        expect(unwrappedAmount).to.equals(2000);
    });

    it("unwrapped to wrapped converting", async function () {
        let liquidityIndex = new BN(10).pow(new BN(27)); // 10^27
        await usdPlus.setLiquidityIndex(liquidityIndex.toString());

        let wrappedAmount = 1000;
        let unwrappedAmount = await wrappedUsdPlus.convertToShares(wrappedAmount);
        expect(unwrappedAmount).to.equals(wrappedAmount);

        liquidityIndex = new BN(10).pow(new BN(27)).divn(2); // 5*10^26
        await usdPlus.setLiquidityIndex(liquidityIndex.toString());

        unwrappedAmount = await wrappedUsdPlus.convertToShares(wrappedAmount);
        expect(unwrappedAmount).to.equals(2000);

        liquidityIndex = new BN(10).pow(new BN(27)).muln(2); // 2*10^27
        await usdPlus.setLiquidityIndex(liquidityIndex.toString());

        unwrappedAmount = await wrappedUsdPlus.convertToShares(wrappedAmount);
        expect(unwrappedAmount).to.equals(500);
    });

    it("unwrapped <-> wrapped converting", async function () {
        let liquidityIndex = new BN(10).pow(new BN(27)); // 10^27
        await usdPlus.setLiquidityIndex(liquidityIndex.toString());

        let wrappedAmount = 1000;
        let unwrappedAmount = await wrappedUsdPlus.convertToShares(wrappedAmount);
        let newWrappedAmount = await wrappedUsdPlus.convertToAssets(unwrappedAmount);
        expect(newWrappedAmount).to.equals(wrappedAmount);

        liquidityIndex = new BN(10).pow(new BN(27)).divn(2); // 5*10^26
        await usdPlus.setLiquidityIndex(liquidityIndex.toString());

        unwrappedAmount = await wrappedUsdPlus.convertToShares(wrappedAmount);
        newWrappedAmount = await wrappedUsdPlus.convertToAssets(unwrappedAmount);
        expect(newWrappedAmount).to.equals(wrappedAmount);

        liquidityIndex = new BN(10).pow(new BN(27)).muln(2); // 2*10^27
        await usdPlus.setLiquidityIndex(liquidityIndex.toString());

        unwrappedAmount = await wrappedUsdPlus.convertToShares(wrappedAmount);
        newWrappedAmount = await wrappedUsdPlus.convertToAssets(unwrappedAmount);
        expect(newWrappedAmount).to.equals(wrappedAmount);
    });

    it("unwrapped balance", async function () {
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
        expect(await wrappedUsdPlus.assetBalanceOf(account)).to.equals(usdPlusAmountToWrap);
    });

    it("assetBalanceOf", async function () {
        let liquidityIndex = new BN(10).pow(new BN(27)); // 10^27
        await usdPlus.setLiquidityIndex(liquidityIndex.toString());

        let usdcAmountToDeposit = 250;

        expect(await wrappedUsdPlus.totalAssets()).to.equals(0);
        expect(await wrappedUsdPlus.assetBalanceOf(account)).to.equals(0);

        await usdPlus.mint(account, usdcAmountToDeposit);
        await usdPlus.approve(wrappedUsdPlus.address, usdcAmountToDeposit);

        // call again to change state
        await wrappedUsdPlus.deposit(usdcAmountToDeposit, account);

        expect(await wrappedUsdPlus.totalAssets()).to.equals(usdcAmountToDeposit);
        expect(await wrappedUsdPlus.assetBalanceOf(account)).to.equals(usdcAmountToDeposit);
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
        let mintedWrappedAmount = await wrappedUsdPlus.callStatic.deposit(usdcAmountToDeposit, account);
        expect(mintedWrappedAmount.toString()).to.equals(String(usdcAmountToDeposit));

        // call again to change state
        let receipt = await (await wrappedUsdPlus.deposit(usdcAmountToDeposit, account)).wait();

        const depositEvent = receipt.events.find((e) => e.event === 'Deposit' && e.args[0] === account);
        expect(depositEvent.args[3].toString()).to.equals(String(mintedWrappedAmount));

        expect(await usdPlus.balanceOf(wrappedUsdPlus.address)).to.equals(usdcAmountToDeposit);
        expect(await usdPlus.balanceOf(account)).to.equals(0);
        expect(await wrappedUsdPlus.balanceOf(account)).to.equals(mintedWrappedAmount);
    });

    it("deposit and redeem 1:1", async function () {
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
        let mintedWrappedAmount = await wrappedUsdPlus.callStatic.deposit(usdcAmountToDeposit, account);
        expect(mintedWrappedAmount.toString()).to.equals(String(usdcAmountToDeposit));

        // call again to change state
        await (await wrappedUsdPlus.deposit(usdcAmountToDeposit, account)).wait();

        expect(await usdPlus.balanceOf(wrappedUsdPlus.address)).to.equals(usdcAmountToDeposit);
        expect(await usdPlus.balanceOf(account)).to.equals(0);
        expect(await wrappedUsdPlus.balanceOf(account)).to.equals(mintedWrappedAmount);

        // callStatic doesn't change state but return value
        let transferredUnwrappedAmount = await wrappedUsdPlus.callStatic.redeem(usdcAmountToDeposit, account, account);
        expect(transferredUnwrappedAmount.toString()).to.equals(String(usdcAmountToDeposit));

        let usdPlusBalanceBefore = await usdPlus.balanceOf(account);

        // call again to change state
        let receipt = await (await wrappedUsdPlus.redeem(usdcAmountToDeposit, account, account)).wait();

        const depositEvent = receipt.events.find((e) => e.event === 'Withdraw' && e.args[0] === account);
        expect(depositEvent.args[3].toString()).to.equals(String(transferredUnwrappedAmount));

        expect(await usdPlus.balanceOf(wrappedUsdPlus.address)).to.equals(0);
        expect(await wrappedUsdPlus.balanceOf(account)).to.equals(0);

        expect((await usdPlus.balanceOf(account)).toString()).to.equals(
            new BN(usdPlusBalanceBefore.toString())
                .add(new BN(transferredUnwrappedAmount.toString()))
                .toString()
        );
    });

    it("deposit and redeem 2:1", async function () {
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
        let usdcAmountToRedeem = 125;

        expect(await usdPlus.balanceOf(wrappedUsdPlus.address)).to.equals(0);
        expect(await usdPlus.balanceOf(account)).to.equals(0);
        expect(await wrappedUsdPlus.balanceOf(account)).to.equals(0);

        await usdPlus.mint(account, usdcAmountToDeposit);
        await usdPlus.approve(wrappedUsdPlus.address, usdcAmountToDeposit);

        // callStatic doesn't change state but return value
        let mintedWrappedAmount = await wrappedUsdPlus.callStatic.deposit(usdcAmountToDeposit, account);
        expect(mintedWrappedAmount.toString()).to.equals(String(usdcAmountToDeposit));

        // call again to change state
        await (await wrappedUsdPlus.deposit(usdcAmountToDeposit, account)).wait();

        expect(await usdPlus.balanceOf(wrappedUsdPlus.address)).to.equals(usdcAmountToDeposit);
        expect(await usdPlus.balanceOf(account)).to.equals(0);
        expect(await wrappedUsdPlus.balanceOf(account)).to.equals(mintedWrappedAmount);

        // callStatic doesn't change state but return value
        let transferredUnwrappedAmount = await wrappedUsdPlus.callStatic.redeem(usdcAmountToRedeem, account, account);
        expect(transferredUnwrappedAmount.toString()).to.equals(String(usdcAmountToRedeem));

        let usdPlusBalanceBefore = await usdPlus.balanceOf(account);

        // call again to change state
        let receipt = await (await wrappedUsdPlus.redeem(usdcAmountToRedeem, account, account)).wait();

        const depositEvent = receipt.events.find((e) => e.event === 'Withdraw' && e.args[0] === account);
        expect(depositEvent.args[3].toString()).to.equals(String(transferredUnwrappedAmount));

        expect(await usdPlus.balanceOf(wrappedUsdPlus.address)).to.equals(125);
        expect(await wrappedUsdPlus.balanceOf(account)).to.equals(125);

        expect((await usdPlus.balanceOf(account)).toString()).to.equals(
            new BN(usdPlusBalanceBefore.toString())
                .add(new BN(transferredUnwrappedAmount.toString()))
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
        let transferredUnwrappedAmount = await wrappedUsdPlus.callStatic.redeem(usdcAmountToDeposit, account, tmpUser.address);
        expect(transferredUnwrappedAmount.toString()).to.equals(String(usdcAmountToDeposit));

        let usdPlusBalanceBefore = await usdPlus.balanceOf(account);

        // call again to change state
        let receipt = await (await wrappedUsdPlus.redeem(usdcAmountToDeposit, account, tmpUser.address)).wait();

        expect(await usdPlus.balanceOf(wrappedUsdPlus.address)).to.equals(0);
        expect(await wrappedUsdPlus.balanceOf(account)).to.equals(0);
        expect(await wrappedUsdPlus.balanceOf(tmpUser.address)).to.equals(0);
        expect(await wrappedUsdPlus.allowance(tmpUser.address, account)).to.equals(0);

        expect((await usdPlus.balanceOf(account)).toString()).to.equals(
            new BN(usdPlusBalanceBefore.toString())
                .add(new BN(transferredUnwrappedAmount.toString()))
                .toString()
        );
    });

});




