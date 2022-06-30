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
    let exchange;


    sharedBeforeEach('deploy and setup', async () => {
        // need to run inside IDEA via node script running
        await hre.run("compile");

        await deployments.fixture(['test', 'test_setting']);

        const {deployer} = await getNamedAccounts();
        account = deployer;

        usdPlus = await ethers.getContract("MockUsdPlusToken");
        wrappedUsdPlus = await ethers.getContract("WrappedUsdPlusToken");
        usdc = await ethers.getContractAt("IERC20", POLYGON.usdc);
        exchange = await ethers.getContract("MockExchange");
    });


    it("asset token is usd+", async function () {
        let assetToken = await wrappedUsdPlus.asset();
        expect(assetToken.toString()).to.equals(usdPlus.address);
    });

    it("totalAssets", async function () {
        let liquidityIndex = new BN(10).pow(new BN(27)); // 10^27
        await exchange.setLiquidityIndex(liquidityIndex.toString());

        let usdcAmountToDeposit = 250;

        expect(await wrappedUsdPlus.totalAssets()).to.equals(0);
        expect(await wrappedUsdPlus.maxWithdraw(account)).to.equals(0);

        await usdc.approve(exchange.address, usdcAmountToDeposit);
        await exchange.buy(usdc.address, usdcAmountToDeposit);

        await usdPlus.approve(wrappedUsdPlus.address, usdcAmountToDeposit);
        let mintedWrappedAmount = await wrappedUsdPlus.callStatic.deposit(usdcAmountToDeposit, account);

        expect(await wrappedUsdPlus.previewDeposit(usdcAmountToDeposit)).to.equals(mintedWrappedAmount);

        await wrappedUsdPlus.deposit(usdcAmountToDeposit, account);

        liquidityIndex = new BN(10).pow(new BN(27)).muln(2); // 2*10^27
        await exchange.setLiquidityIndex(liquidityIndex.toString());

        expect(await wrappedUsdPlus.balanceOf(account)).to.equals(usdcAmountToDeposit);
        expect(await wrappedUsdPlus.totalAssets()).to.equals(usdcAmountToDeposit * 2);
        
        liquidityIndex = new BN(10).pow(new BN(27)).divn(2); // 5*10^26
        await exchange.setLiquidityIndex(liquidityIndex.toString());

        expect(await wrappedUsdPlus.balanceOf(account)).to.equals(usdcAmountToDeposit);
        expect(await wrappedUsdPlus.totalAssets()).to.equals(usdcAmountToDeposit / 2);
    });

    it("wrapped to unwrapped converting", async function () {
        let liquidityIndex = new BN(10).pow(new BN(27)); // 10^27
        await exchange.setLiquidityIndex(liquidityIndex.toString());

        let wrappedAmount = 1000;
        let unwrappedAmount = await wrappedUsdPlus.convertToAssets(wrappedAmount);
        expect(unwrappedAmount).to.equals(wrappedAmount);

        liquidityIndex = new BN(10).pow(new BN(27)).divn(2); // 5*10^26
        await exchange.setLiquidityIndex(liquidityIndex.toString());

        unwrappedAmount = await wrappedUsdPlus.convertToAssets(wrappedAmount);
        expect(unwrappedAmount).to.equals(500);

        liquidityIndex = new BN(10).pow(new BN(27)).muln(2); // 2*10^27
        await exchange.setLiquidityIndex(liquidityIndex.toString());

        unwrappedAmount = await wrappedUsdPlus.convertToAssets(wrappedAmount);
        expect(unwrappedAmount).to.equals(2000);
    });

    it("unwrapped to wrapped converting", async function () {
        let liquidityIndex = new BN(10).pow(new BN(27)); // 10^27
        await exchange.setLiquidityIndex(liquidityIndex.toString());

        let wrappedAmount = 1000;
        let unwrappedAmount = await wrappedUsdPlus.convertToShares(wrappedAmount);
        expect(unwrappedAmount).to.equals(wrappedAmount);

        liquidityIndex = new BN(10).pow(new BN(27)).divn(2); // 5*10^26
        await exchange.setLiquidityIndex(liquidityIndex.toString());

        unwrappedAmount = await wrappedUsdPlus.convertToShares(wrappedAmount);
        expect(unwrappedAmount).to.equals(2000);

        liquidityIndex = new BN(10).pow(new BN(27)).muln(2); // 2*10^27
        await exchange.setLiquidityIndex(liquidityIndex.toString());

        unwrappedAmount = await wrappedUsdPlus.convertToShares(wrappedAmount);
        expect(unwrappedAmount).to.equals(500);
    });

    it("unwrapped <-> wrapped converting", async function () {
        let liquidityIndex = new BN(10).pow(new BN(27)); // 10^27
        await exchange.setLiquidityIndex(liquidityIndex.toString());

        let wrappedAmount = 1000;
        let unwrappedAmount = await wrappedUsdPlus.convertToShares(wrappedAmount);
        let newWrappedAmount = await wrappedUsdPlus.convertToAssets(unwrappedAmount);
        expect(newWrappedAmount).to.equals(wrappedAmount);

        liquidityIndex = new BN(10).pow(new BN(27)).divn(2); // 5*10^26
        await exchange.setLiquidityIndex(liquidityIndex.toString());

        unwrappedAmount = await wrappedUsdPlus.convertToShares(wrappedAmount);
        newWrappedAmount = await wrappedUsdPlus.convertToAssets(unwrappedAmount);
        expect(newWrappedAmount).to.equals(wrappedAmount);

        liquidityIndex = new BN(10).pow(new BN(27)).muln(2); // 2*10^27
        await exchange.setLiquidityIndex(liquidityIndex.toString());

        unwrappedAmount = await wrappedUsdPlus.convertToShares(wrappedAmount);
        newWrappedAmount = await wrappedUsdPlus.convertToAssets(unwrappedAmount);
        expect(newWrappedAmount).to.equals(wrappedAmount);
    });

    it("unwrapped balance", async function () {
        let liquidityIndex = new BN(10).pow(new BN(27)).muln(2); // 2*10^27
        await exchange.setLiquidityIndex(liquidityIndex.toString());

        let usdPlusAmountToWrap = 250;
        let usdcAmountToDeposit = 1000;

        // 500 USD+ minted with liquidityIndex = 2*10^27
        await usdc.approve(exchange.address, usdcAmountToDeposit);
        await exchange.buy(usdc.address, usdcAmountToDeposit);

        await usdPlus.approve(wrappedUsdPlus.address, usdPlusAmountToWrap);
        await wrappedUsdPlus.deposit(usdPlusAmountToWrap, account);

        expect(await wrappedUsdPlus.balanceOf(account)).to.equals(usdPlusAmountToWrap / 2);
        expect(await wrappedUsdPlus.maxWithdraw(account)).to.equals(usdPlusAmountToWrap);
    });

    it("maxDeposit", async function () {
        let uint256max = new BN(2).pow(new BN(256)).subn(1); 
        expect(await wrappedUsdPlus.maxDeposit(account)).to.equals(uint256max.toString());
    });

    it("maxMint", async function () {
        let uint256max = new BN(2).pow(new BN(256)).subn(1); 
        expect(await wrappedUsdPlus.maxMint(account)).to.equals(uint256max.toString());
    });

    it("maxRedeem", async function () {
        let liquidityIndex = new BN(10).pow(new BN(27)); // 10^27
        await exchange.setLiquidityIndex(liquidityIndex.toString());

        let usdcAmountToDeposit = 250;

        expect(await wrappedUsdPlus.totalAssets()).to.equals(0);
        expect(await wrappedUsdPlus.maxRedeem(account)).to.equals(0);

        await usdc.approve(exchange.address, usdcAmountToDeposit);
        await exchange.buy(usdc.address, usdcAmountToDeposit);

        await usdPlus.approve(wrappedUsdPlus.address, usdcAmountToDeposit);
        await wrappedUsdPlus.deposit(usdcAmountToDeposit, account);

        liquidityIndex = new BN(10).pow(new BN(27)).muln(2); // 2*10^27
        await exchange.setLiquidityIndex(liquidityIndex.toString());

        expect(await wrappedUsdPlus.totalAssets()).to.equals(usdcAmountToDeposit * 2);
        expect(await wrappedUsdPlus.maxRedeem(account)).to.equals(usdcAmountToDeposit);
        
        liquidityIndex = new BN(10).pow(new BN(27)).divn(2); // 5*10^26
        await exchange.setLiquidityIndex(liquidityIndex.toString());

        expect(await wrappedUsdPlus.totalAssets()).to.equals(usdcAmountToDeposit / 2);
        expect(await wrappedUsdPlus.maxRedeem(account)).to.equals(usdcAmountToDeposit);
    });

    it("maxWithdraw", async function () {
        let liquidityIndex = new BN(10).pow(new BN(27)); // 10^27
        await exchange.setLiquidityIndex(liquidityIndex.toString());

        let usdcAmountToDeposit = 250;

        expect(await wrappedUsdPlus.totalAssets()).to.equals(0);
        expect(await wrappedUsdPlus.maxWithdraw(account)).to.equals(0);

        await usdc.approve(exchange.address, usdcAmountToDeposit);
        await exchange.buy(usdc.address, usdcAmountToDeposit);

        await usdPlus.approve(wrappedUsdPlus.address, usdcAmountToDeposit);
        await wrappedUsdPlus.deposit(usdcAmountToDeposit, account);

        liquidityIndex = new BN(10).pow(new BN(27)).muln(2); // 2*10^27
        await exchange.setLiquidityIndex(liquidityIndex.toString());

        expect(await wrappedUsdPlus.totalAssets()).to.equals(usdcAmountToDeposit * 2);
        expect(await wrappedUsdPlus.maxWithdraw(account)).to.equals(usdcAmountToDeposit * 2);
        
        liquidityIndex = new BN(10).pow(new BN(27)).divn(2); // 5*10^26
        await exchange.setLiquidityIndex(liquidityIndex.toString());

        expect(await wrappedUsdPlus.totalAssets()).to.equals(usdcAmountToDeposit / 2);
        expect(await wrappedUsdPlus.maxWithdraw(account)).to.equals(usdcAmountToDeposit / 2);
    });

    it("rate same to usdPlus liquidity index", async function () {
        let liquidityIndex = new BN(10).pow(new BN(27)); // 10^27
        await exchange.setLiquidityIndex(liquidityIndex.toString());
        let rate = await wrappedUsdPlus.rate();
        await exchange.setLiquidityIndex(liquidityIndex.toString());

        liquidityIndex = liquidityIndex.subn(1000);
        await exchange.setLiquidityIndex(liquidityIndex.toString());
        rate = await wrappedUsdPlus.rate();
        expect(rate.toString()).to.equals(liquidityIndex.toString());
    });

    it("deposit 1:1", async function () {
        let liquidityIndex = new BN(10).pow(new BN(27)); // 10^27
        await exchange.setLiquidityIndex(liquidityIndex.toString());

        let usdcAmountToDeposit = 250;

        await expectRevert(
            wrappedUsdPlus.callStatic.deposit(1, ZERO_ADDRESS),
            'Zero address for receiver not allowed',
        );

        await expectRevert(
            wrappedUsdPlus.callStatic.deposit(0, account),
            'Zero assets not allowed',
        );

        await expectRevert(
            wrappedUsdPlus.callStatic.deposit(usdcAmountToDeposit, account),
            'ERC20: transfer amount exceeds balance',
        );

        expect(await usdPlus.balanceOf(wrappedUsdPlus.address)).to.equals(0);
        expect(await usdPlus.balanceOf(account)).to.equals(0);
        expect(await wrappedUsdPlus.balanceOf(account)).to.equals(0);

        await usdc.approve(exchange.address, usdcAmountToDeposit);
        await exchange.buy(usdc.address, usdcAmountToDeposit);
        await usdPlus.approve(wrappedUsdPlus.address, usdcAmountToDeposit);

        // callStatic doesn't change state but return value
        let mintedWrappedAmount = await wrappedUsdPlus.callStatic.deposit(usdcAmountToDeposit, account);
        expect(mintedWrappedAmount.toString()).to.equals(await wrappedUsdPlus.previewDeposit(usdcAmountToDeposit));

        // call again to change state
        let receipt = await (await wrappedUsdPlus.deposit(usdcAmountToDeposit, account)).wait();

        liquidityIndex = new BN(10).pow(new BN(27)).muln(2); // 2*10^27
        await exchange.setLiquidityIndex(liquidityIndex.toString());

        const depositEvent = receipt.events.find((e) => e.event === 'Deposit' && e.args[0] === account);
        expect(depositEvent.args[3].toString()).to.equals(String(mintedWrappedAmount));

        expect(await usdPlus.balanceOf(wrappedUsdPlus.address)).to.equals(usdcAmountToDeposit * 2);
        expect(await usdPlus.balanceOf(account)).to.equals(0);
        expect(await wrappedUsdPlus.balanceOf(account)).to.equals(mintedWrappedAmount);
    });

    it("deposit and redeem 1:1", async function () {
        let liquidityIndex = new BN(10).pow(new BN(27)); // 10^27
        await exchange.setLiquidityIndex(liquidityIndex.toString());

        let usdcAmountToDeposit = 250;

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

        expect(await usdPlus.balanceOf(wrappedUsdPlus.address)).to.equals(0);
        expect(await usdPlus.balanceOf(account)).to.equals(0);
        expect(await wrappedUsdPlus.balanceOf(account)).to.equals(0);

        await usdc.approve(exchange.address, usdcAmountToDeposit);
        await exchange.buy(usdc.address, usdcAmountToDeposit);
        await usdPlus.approve(wrappedUsdPlus.address, usdcAmountToDeposit);

        // callStatic doesn't change state but return value
        let mintedWrappedAmount = await wrappedUsdPlus.callStatic.deposit(usdcAmountToDeposit, account);
        expect(mintedWrappedAmount.toString()).to.equals(await wrappedUsdPlus.previewDeposit(usdcAmountToDeposit));

        // call again to change state
        await (await wrappedUsdPlus.deposit(usdcAmountToDeposit, account)).wait();

        liquidityIndex = new BN(10).pow(new BN(27)).muln(2); // 2*10^27
        await exchange.setLiquidityIndex(liquidityIndex.toString());
        
        expect(await usdPlus.balanceOf(wrappedUsdPlus.address)).to.equals(usdcAmountToDeposit * 2);
        expect(await usdPlus.balanceOf(account)).to.equals(0);
        expect(await wrappedUsdPlus.balanceOf(account)).to.equals(mintedWrappedAmount);

        // callStatic doesn't change state but return value
        let transferredUnwrappedAmount = await wrappedUsdPlus.callStatic.redeem(mintedWrappedAmount, account, account);
        expect(transferredUnwrappedAmount.toString()).to.equals(await wrappedUsdPlus.previewRedeem(mintedWrappedAmount));

        let usdPlusBalanceBefore = await usdPlus.balanceOf(account);

        // call again to change state
        let receipt = await (await wrappedUsdPlus.redeem(mintedWrappedAmount, account, account)).wait();

        const withdrawEvent = receipt.events.find((e) => e.event === 'Withdraw' && e.args[0] === account);
        expect(withdrawEvent.args[3].toString()).to.equals(String(transferredUnwrappedAmount));

        expect(await usdPlus.balanceOf(wrappedUsdPlus.address)).to.equals(0);
        expect(await wrappedUsdPlus.balanceOf(account)).to.equals(0);

        expect((await usdPlus.balanceOf(account)).toString()).to.equals(
            new BN(usdPlusBalanceBefore.toString())
                .add(new BN(transferredUnwrappedAmount.toString()))
                .toString()
        );
    });

    it("redeem another owner", async function () {
        const [owner, tmpUser] = await ethers.getSigners();

        let liquidityIndex = new BN(10).pow(new BN(27)); // 10^27
        await exchange.setLiquidityIndex(liquidityIndex.toString());

        let usdcAmountToDeposit = 250;
        await expectRevert(
            wrappedUsdPlus.callStatic.redeem(usdcAmountToDeposit, account, tmpUser.address),
            'Redeem amount exceeds allowance',
        );

        await usdc.approve(exchange.address, usdcAmountToDeposit);
        await exchange.buy(usdc.address, usdcAmountToDeposit);
        await usdPlus.approve(wrappedUsdPlus.address, usdcAmountToDeposit);

        // callStatic doesn't change state but return value
        let mintedWrappedAmount = await wrappedUsdPlus.callStatic.deposit(usdcAmountToDeposit, tmpUser.address);
        expect(mintedWrappedAmount.toString()).to.equals(await wrappedUsdPlus.previewDeposit(usdcAmountToDeposit));

        // call again to change state
        await (await wrappedUsdPlus.deposit(usdcAmountToDeposit, tmpUser.address)).wait();

        liquidityIndex = new BN(10).pow(new BN(27)).muln(2); // 2*10^27
        await exchange.setLiquidityIndex(liquidityIndex.toString());

        expect(await usdPlus.balanceOf(wrappedUsdPlus.address)).to.equals(usdcAmountToDeposit * 2);
        expect(await usdPlus.balanceOf(account)).to.equals(0);
        expect(await wrappedUsdPlus.balanceOf(tmpUser.address)).to.equals(mintedWrappedAmount);

        await wrappedUsdPlus.connect(tmpUser).approve(account, mintedWrappedAmount);
        expect(await wrappedUsdPlus.allowance(tmpUser.address, account)).to.equals(mintedWrappedAmount);

        // callStatic doesn't change state but return value
        let transferredUnwrappedAmount = await wrappedUsdPlus.callStatic.redeem(mintedWrappedAmount, account, tmpUser.address);
        expect(transferredUnwrappedAmount.toString()).to.equals(await wrappedUsdPlus.previewRedeem(mintedWrappedAmount));

        let usdPlusBalanceBefore = await usdPlus.balanceOf(account);

        // call again to change state
        let receipt = await (await wrappedUsdPlus.redeem(mintedWrappedAmount, account, tmpUser.address)).wait();

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

    it("deposit and redeem 2:1", async function () {
        let liquidityIndex = new BN(10).pow(new BN(27)); // 10^27
        await exchange.setLiquidityIndex(liquidityIndex.toString());

        let usdcAmountToDeposit = 250;

        expect(await usdPlus.balanceOf(wrappedUsdPlus.address)).to.equals(0);
        expect(await usdPlus.balanceOf(account)).to.equals(0);
        expect(await wrappedUsdPlus.balanceOf(account)).to.equals(0);

        await usdc.approve(exchange.address, usdcAmountToDeposit);
        await exchange.buy(usdc.address, usdcAmountToDeposit);
        await usdPlus.approve(wrappedUsdPlus.address, usdcAmountToDeposit);

        // callStatic doesn't change state but return value
        let mintedWrappedAmount = await wrappedUsdPlus.callStatic.deposit(usdcAmountToDeposit, account);
        expect(mintedWrappedAmount.toString()).to.equals(await wrappedUsdPlus.previewDeposit(usdcAmountToDeposit));

        // call again to change state
        await (await wrappedUsdPlus.deposit(usdcAmountToDeposit, account)).wait();

        liquidityIndex = new BN(10).pow(new BN(27)).muln(2); // 2*10^27
        await exchange.setLiquidityIndex(liquidityIndex.toString());
        
        expect(await usdPlus.balanceOf(wrappedUsdPlus.address)).to.equals(usdcAmountToDeposit * 2);
        expect(await usdPlus.balanceOf(account)).to.equals(0);
        expect(await wrappedUsdPlus.balanceOf(account)).to.equals(mintedWrappedAmount);

        // callStatic doesn't change state but return value
        let transferredUnwrappedAmount = await wrappedUsdPlus.callStatic.redeem(mintedWrappedAmount / 2, account, account);
        expect(transferredUnwrappedAmount.toString()).to.equals(await wrappedUsdPlus.previewRedeem(mintedWrappedAmount / 2));

        let usdPlusBalanceBefore = await usdPlus.balanceOf(account);

        // call again to change state
        let receipt = await (await wrappedUsdPlus.redeem(mintedWrappedAmount / 2, account, account)).wait();

        expect(await usdPlus.balanceOf(wrappedUsdPlus.address)).to.equals(250);
        expect(await wrappedUsdPlus.balanceOf(account)).to.equals(125);

        expect((await usdPlus.balanceOf(account)).toString()).to.equals(
            new BN(usdPlusBalanceBefore.toString())
                .add(new BN(transferredUnwrappedAmount.toString()))
                .toString()
        );
    });

    it("mint 1:1", async function () {
        let liquidityIndex = new BN(10).pow(new BN(27)); // 10^27
        await exchange.setLiquidityIndex(liquidityIndex.toString());

        let usdcAmountToMint = 250;
        let sharesToMint = await wrappedUsdPlus.convertToShares(usdcAmountToMint);

        await expectRevert(
            wrappedUsdPlus.callStatic.mint(1, ZERO_ADDRESS),
            'Zero address for receiver not allowed',
        );

        await expectRevert(
            wrappedUsdPlus.callStatic.mint(0, account),
            'Zero shares not allowed',
        );

        await expectRevert(
            wrappedUsdPlus.callStatic.mint(sharesToMint, account),
            'ERC20: transfer amount exceeds balance',
        );

        expect(await usdPlus.balanceOf(wrappedUsdPlus.address)).to.equals(0);
        expect(await usdPlus.balanceOf(account)).to.equals(0);
        expect(await wrappedUsdPlus.balanceOf(account)).to.equals(0);

        await usdc.approve(exchange.address, usdcAmountToMint);
        await exchange.buy(usdc.address, usdcAmountToMint);
        await usdPlus.approve(wrappedUsdPlus.address, usdcAmountToMint);

        // callStatic doesn't change state but return value
        let mintedWrappedAmount = await wrappedUsdPlus.callStatic.mint(sharesToMint, account);
        expect(mintedWrappedAmount.toString()).to.equals(await wrappedUsdPlus.previewMint(sharesToMint));

        // call again to change state
        let receipt = await (await wrappedUsdPlus.mint(sharesToMint, account)).wait();

        liquidityIndex = new BN(10).pow(new BN(27)).muln(2); // 2*10^27
        await exchange.setLiquidityIndex(liquidityIndex.toString());

        const depositEvent = receipt.events.find((e) => e.event === 'Deposit' && e.args[0] === account);
        expect(depositEvent.args[3].toString()).to.equals(sharesToMint);

        expect(await usdPlus.balanceOf(wrappedUsdPlus.address)).to.equals(mintedWrappedAmount * 2);
        expect(await usdPlus.balanceOf(account)).to.equals(0);
        expect(await wrappedUsdPlus.balanceOf(account)).to.equals(sharesToMint);
    });

    it("mint and withdraw 1:1", async function () {
        let liquidityIndex = new BN(10).pow(new BN(27)); // 10^27
        await exchange.setLiquidityIndex(liquidityIndex.toString());

        let usdcAmountToMint = 250;
        let sharesToMint = await wrappedUsdPlus.convertToShares(usdcAmountToMint);

        await expectRevert(
            wrappedUsdPlus.callStatic.withdraw(1, ZERO_ADDRESS, account),
            'Zero address for receiver not allowed',
        );

        await expectRevert(
            wrappedUsdPlus.callStatic.withdraw(1, account, ZERO_ADDRESS),
            'Zero address for owner not allowed',
        );

        await expectRevert(
            wrappedUsdPlus.callStatic.withdraw(0, account, account),
            'Zero assets not allowed',
        );

        expect(await usdPlus.balanceOf(wrappedUsdPlus.address)).to.equals(0);
        expect(await usdPlus.balanceOf(account)).to.equals(0);
        expect(await wrappedUsdPlus.balanceOf(account)).to.equals(0);

        await usdc.approve(exchange.address, usdcAmountToMint);
        await exchange.buy(usdc.address, usdcAmountToMint);
        await usdPlus.approve(wrappedUsdPlus.address, usdcAmountToMint);

        // callStatic doesn't change state but return value
        let mintedWrappedAmount = await wrappedUsdPlus.callStatic.mint(sharesToMint, account);
        expect(mintedWrappedAmount.toString()).to.equals(await wrappedUsdPlus.previewMint(sharesToMint));

        // call again to change state
        await (await wrappedUsdPlus.mint(sharesToMint, account)).wait();

        liquidityIndex = new BN(10).pow(new BN(27)).muln(2); // 2*10^27
        await exchange.setLiquidityIndex(liquidityIndex.toString());

        expect(await usdPlus.balanceOf(wrappedUsdPlus.address)).to.equals(mintedWrappedAmount * 2);
        expect(await usdPlus.balanceOf(account)).to.equals(0);
        expect(await wrappedUsdPlus.balanceOf(account)).to.equals(sharesToMint);

        // callStatic doesn't change state but return value
        let transferredUnwrappedAmount = await wrappedUsdPlus.callStatic.withdraw(mintedWrappedAmount * 2, account, account);
        expect(transferredUnwrappedAmount.toString()).to.equals(await wrappedUsdPlus.previewWithdraw(mintedWrappedAmount * 2));

        let usdPlusBalanceBefore = await usdPlus.balanceOf(account);

        // call again to change state
        let receipt = await (await wrappedUsdPlus.withdraw(mintedWrappedAmount * 2, account, account)).wait();

        const withdrawEvent = receipt.events.find((e) => e.event === 'Withdraw' && e.args[0] === account);
        expect(withdrawEvent.args[3].toString()).to.equals(String(mintedWrappedAmount * 2));

        expect(await usdPlus.balanceOf(wrappedUsdPlus.address)).to.equals(0);
        expect(await wrappedUsdPlus.balanceOf(account)).to.equals(0);

        expect((await usdPlus.balanceOf(account)).toString()).to.equals(
            new BN(usdPlusBalanceBefore.toString())
                .add(new BN((await wrappedUsdPlus.convertToAssets(transferredUnwrappedAmount)).toString()))
                .toString()
        );
    });

    it("withdraw another owner", async function () {
        const [owner, tmpUser] = await ethers.getSigners();

        let liquidityIndex = new BN(10).pow(new BN(27)); // 10^27
        await exchange.setLiquidityIndex(liquidityIndex.toString());

        let usdcAmountToMint = 250;
        let sharesToMint = await wrappedUsdPlus.convertToShares(usdcAmountToMint);

        await expectRevert(
            wrappedUsdPlus.callStatic.withdraw(usdcAmountToMint, account, tmpUser.address),
            'Withdraw amount exceeds allowance',
        );

        await usdc.approve(exchange.address, usdcAmountToMint);
        await exchange.buy(usdc.address, usdcAmountToMint);
        await usdPlus.approve(wrappedUsdPlus.address, usdcAmountToMint);

        // callStatic doesn't change state but return value
        let mintedWrappedAmount = await wrappedUsdPlus.callStatic.mint(sharesToMint, tmpUser.address);
        expect(mintedWrappedAmount.toString()).to.equals(await wrappedUsdPlus.previewMint(sharesToMint));

        // call again to change state
        await (await wrappedUsdPlus.mint(sharesToMint, tmpUser.address)).wait();

        liquidityIndex = new BN(10).pow(new BN(27)).muln(2); // 2*10^27
        await exchange.setLiquidityIndex(liquidityIndex.toString());

        expect(await usdPlus.balanceOf(wrappedUsdPlus.address)).to.equals(mintedWrappedAmount * 2);
        expect(await usdPlus.balanceOf(account)).to.equals(0);
        expect(await wrappedUsdPlus.balanceOf(tmpUser.address)).to.equals(sharesToMint);

        await wrappedUsdPlus.connect(tmpUser).approve(account, sharesToMint);
        expect(await wrappedUsdPlus.allowance(tmpUser.address, account)).to.equals(sharesToMint);

        // callStatic doesn't change state but return value
        let transferredUnwrappedAmount = await wrappedUsdPlus.callStatic.withdraw(mintedWrappedAmount * 2, account, tmpUser.address);
        expect(transferredUnwrappedAmount.toString()).to.equals(await wrappedUsdPlus.previewWithdraw(mintedWrappedAmount * 2));

        let usdPlusBalanceBefore = await usdPlus.balanceOf(account);

        // call again to change state
        let receipt = await (await wrappedUsdPlus.withdraw(mintedWrappedAmount * 2, account, tmpUser.address)).wait();

        expect(await usdPlus.balanceOf(wrappedUsdPlus.address)).to.equals(0);
        expect(await wrappedUsdPlus.balanceOf(account)).to.equals(0);
        expect(await wrappedUsdPlus.balanceOf(tmpUser.address)).to.equals(0);
        expect(await wrappedUsdPlus.allowance(tmpUser.address, account)).to.equals(0);

        expect((await usdPlus.balanceOf(account)).toString()).to.equals(
            new BN(usdPlusBalanceBefore.toString())
                .add(new BN((await wrappedUsdPlus.convertToAssets(transferredUnwrappedAmount)).toString()))
                .toString()
        );
    });

    it("mint and withdraw 2:1", async function () {
        let liquidityIndex = new BN(10).pow(new BN(27)); // 10^27
        await exchange.setLiquidityIndex(liquidityIndex.toString());

        let usdcAmountToMint = 250;
        let sharesToMint = await wrappedUsdPlus.convertToShares(usdcAmountToMint);

        expect(await usdPlus.balanceOf(wrappedUsdPlus.address)).to.equals(0);
        expect(await usdPlus.balanceOf(account)).to.equals(0);
        expect(await wrappedUsdPlus.balanceOf(account)).to.equals(0);

        await usdc.approve(exchange.address, usdcAmountToMint);
        await exchange.buy(usdc.address, usdcAmountToMint);
        await usdPlus.approve(wrappedUsdPlus.address, usdcAmountToMint);

        // callStatic doesn't change state but return value
        let mintedWrappedAmount = await wrappedUsdPlus.callStatic.mint(sharesToMint, account);
        expect(mintedWrappedAmount.toString()).to.equals(await wrappedUsdPlus.previewWithdraw(sharesToMint));

        // call again to change state
        await (await wrappedUsdPlus.mint(sharesToMint, account)).wait();

        liquidityIndex = new BN(10).pow(new BN(27)).muln(2); // 2*10^27
        await exchange.setLiquidityIndex(liquidityIndex.toString());

        expect(await usdPlus.balanceOf(wrappedUsdPlus.address)).to.equals(mintedWrappedAmount * 2);
        expect(await usdPlus.balanceOf(account)).to.equals(0);
        expect(await wrappedUsdPlus.balanceOf(account)).to.equals(sharesToMint);

        // callStatic doesn't change state but return value
        let transferredUnwrappedAmount = await wrappedUsdPlus.callStatic.withdraw(mintedWrappedAmount, account, account);
        expect(transferredUnwrappedAmount.toString()).to.equals(await wrappedUsdPlus.previewWithdraw(mintedWrappedAmount));

        let usdPlusBalanceBefore = await usdPlus.balanceOf(account);

        // call again to change state
        let receipt = await (await wrappedUsdPlus.withdraw(mintedWrappedAmount, account, account)).wait();

        expect(await usdPlus.balanceOf(wrappedUsdPlus.address)).to.equals(250);
        expect(await wrappedUsdPlus.balanceOf(account)).to.equals(125);

        expect((await usdPlus.balanceOf(account)).toString()).to.equals(
            new BN(usdPlusBalanceBefore.toString())
                .add(new BN((await wrappedUsdPlus.convertToAssets(transferredUnwrappedAmount)).toString()))
                .toString()
        );
    });

    it("usd+ before deposit - usd+ after redeem = 2 if LiquidityIndex don't grow", async function () {
        // set LiquidityIndex
        await exchange.setLiquidityIndex('1030604144042764124558114376');

        // buy usd+
        let wrappedAmount = 20240461;
        await usdc.approve(exchange.address, wrappedAmount);
        await exchange.buy(usdc.address, wrappedAmount);

        // deposit wusd+
        let usdPlusBalanceBefore = await usdPlus.balanceOf(account);
        await usdPlus.approve(wrappedUsdPlus.address, usdPlusBalanceBefore);
        let mintedWrappedAmount = await wrappedUsdPlus.callStatic.deposit(usdPlusBalanceBefore, account);
        await wrappedUsdPlus.deposit(usdPlusBalanceBefore, account);
        let wrappedUsdPlusBalance = await wrappedUsdPlus.balanceOf(account);
        expect(mintedWrappedAmount).to.equals(wrappedUsdPlusBalance);

        // redeem wusd+
        let unwrappedAmount = await wrappedUsdPlus.callStatic.redeem(wrappedUsdPlusBalance, account, account);
        await wrappedUsdPlus.redeem(wrappedUsdPlusBalance, account, account);
        let usdPlusBalanceAfter = await usdPlus.balanceOf(account);
        expect(usdPlusBalanceAfter).to.equals(unwrappedAmount);

        expect(usdPlusBalanceBefore - usdPlusBalanceAfter).to.equals(2);
    });

    it("usd+ before deposit - usd+ after redeem = 1 if LiquidityIndex don't grow", async function () {
        // set LiquidityIndex
        await exchange.setLiquidityIndex('1030604134042764124558114376');

        // buy usd+
        let wrappedAmount = 20240461;
        await usdc.approve(exchange.address, wrappedAmount);
        await exchange.buy(usdc.address, wrappedAmount);

        // deposit wusd+
        let usdPlusBalanceBefore = await usdPlus.balanceOf(account);
        await usdPlus.approve(wrappedUsdPlus.address, usdPlusBalanceBefore);
        let mintedWrappedAmount = await wrappedUsdPlus.callStatic.deposit(usdPlusBalanceBefore, account);
        await wrappedUsdPlus.deposit(usdPlusBalanceBefore, account);
        let wrappedUsdPlusBalance = await wrappedUsdPlus.balanceOf(account);
        expect(mintedWrappedAmount).to.equals(wrappedUsdPlusBalance);

        // redeem wusd+
        let unwrappedAmount = await wrappedUsdPlus.callStatic.redeem(wrappedUsdPlusBalance, account, account);
        await wrappedUsdPlus.redeem(wrappedUsdPlusBalance, account, account);
        let usdPlusBalanceAfter = await usdPlus.balanceOf(account);
        expect(usdPlusBalanceAfter).to.equals(unwrappedAmount);

        expect(usdPlusBalanceBefore - usdPlusBalanceAfter).to.equals(1);
    });

    it("usd+ before deposit - usd+ after redeem = 0 if LiquidityIndex don't grow", async function () {
        // buy usd+
        let wrappedAmount = 20240461;
        await usdc.approve(exchange.address, wrappedAmount);
        await exchange.buy(usdc.address, wrappedAmount);

        // deposit wusd+
        let usdPlusBalanceBefore = await usdPlus.balanceOf(account);
        await usdPlus.approve(wrappedUsdPlus.address, usdPlusBalanceBefore);
        let mintedWrappedAmount = await wrappedUsdPlus.callStatic.deposit(usdPlusBalanceBefore, account);
        await wrappedUsdPlus.deposit(usdPlusBalanceBefore, account);
        let wrappedUsdPlusBalance = await wrappedUsdPlus.balanceOf(account);
        expect(mintedWrappedAmount).to.equals(wrappedUsdPlusBalance);

        // redeem wusd+
        let unwrappedAmount = await wrappedUsdPlus.callStatic.redeem(wrappedUsdPlusBalance, account, account);
        await wrappedUsdPlus.redeem(wrappedUsdPlusBalance, account, account);
        let usdPlusBalanceAfter = await usdPlus.balanceOf(account);
        expect(usdPlusBalanceAfter).to.equals(unwrappedAmount);

        expect(usdPlusBalanceBefore - usdPlusBalanceAfter).to.equals(0);
    });

    it("usd+ before deposit - usd+ after redeem = 2 if LiquidityIndex small grow", async function () {
        // set LiquidityIndex
        await exchange.setLiquidityIndex('1030604144042764124558114376');

        // buy usd+
        let wrappedAmount = 20240461;
        await usdc.approve(exchange.address, wrappedAmount);
        await exchange.buy(usdc.address, wrappedAmount);

        // deposit wusd+
        let usdPlusBalanceBefore = await usdPlus.balanceOf(account);
        await usdPlus.approve(wrappedUsdPlus.address, usdPlusBalanceBefore);
        let mintedWrappedAmount = await wrappedUsdPlus.callStatic.deposit(usdPlusBalanceBefore, account);
        await wrappedUsdPlus.deposit(usdPlusBalanceBefore, account);
        let wrappedUsdPlusBalance = await wrappedUsdPlus.balanceOf(account);
        expect(mintedWrappedAmount).to.equals(wrappedUsdPlusBalance);

        // set new LiquidityIndex
        await exchange.setLiquidityIndex('1030604144052764124558114376');

        // redeem wusd+
        let unwrappedAmount = await wrappedUsdPlus.callStatic.redeem(wrappedUsdPlusBalance, account, account);
        await wrappedUsdPlus.redeem(wrappedUsdPlusBalance, account, account);
        let usdPlusBalanceAfter = await usdPlus.balanceOf(account);
        expect(usdPlusBalanceAfter).to.equals(unwrappedAmount);

        expect(usdPlusBalanceBefore - usdPlusBalanceAfter).to.equals(2);
    });

    it("usd+ before deposit - usd+ after redeem = 1 if LiquidityIndex small grow", async function () {
        // set LiquidityIndex
        await exchange.setLiquidityIndex('1030604144042764124558114376');

        // buy usd+
        let wrappedAmount = 20240461;
        await usdc.approve(exchange.address, wrappedAmount);
        await exchange.buy(usdc.address, wrappedAmount);

        // deposit wusd+
        let usdPlusBalanceBefore = await usdPlus.balanceOf(account);
        await usdPlus.approve(wrappedUsdPlus.address, usdPlusBalanceBefore);
        let mintedWrappedAmount = await wrappedUsdPlus.callStatic.deposit(usdPlusBalanceBefore, account);
        await wrappedUsdPlus.deposit(usdPlusBalanceBefore, account);
        let wrappedUsdPlusBalance = await wrappedUsdPlus.balanceOf(account);
        expect(mintedWrappedAmount).to.equals(wrappedUsdPlusBalance);

        // set new LiquidityIndex
        await exchange.setLiquidityIndex('1030604168542764124558114376');

        // redeem wusd+
        let unwrappedAmount = await wrappedUsdPlus.callStatic.redeem(wrappedUsdPlusBalance, account, account);
        await wrappedUsdPlus.redeem(wrappedUsdPlusBalance, account, account);
        let usdPlusBalanceAfter = await usdPlus.balanceOf(account);
        expect(usdPlusBalanceAfter).to.equals(unwrappedAmount);

        expect(usdPlusBalanceBefore - usdPlusBalanceAfter).to.equals(1);
    });

    it("usd+ before deposit = usd+ after redeem if LiquidityIndex small grow", async function () {
        // set LiquidityIndex
        await exchange.setLiquidityIndex('1030604134042764124558114376');

        // buy usd+
        let wrappedAmount = 20240461;
        await usdc.approve(exchange.address, wrappedAmount);
        await exchange.buy(usdc.address, wrappedAmount);

        // deposit wusd+
        let usdPlusBalanceBefore = await usdPlus.balanceOf(account);
        await usdPlus.approve(wrappedUsdPlus.address, usdPlusBalanceBefore);
        let mintedWrappedAmount = await wrappedUsdPlus.callStatic.deposit(usdPlusBalanceBefore, account);
        await wrappedUsdPlus.deposit(usdPlusBalanceBefore, account);
        let wrappedUsdPlusBalance = await wrappedUsdPlus.balanceOf(account);
        expect(mintedWrappedAmount).to.equals(wrappedUsdPlusBalance);

        // set new LiquidityIndex
        await exchange.setLiquidityIndex('1030604168542764124558114376');

        // redeem wusd+
        let unwrappedAmount = await wrappedUsdPlus.callStatic.redeem(wrappedUsdPlusBalance, account, account);
        await wrappedUsdPlus.redeem(wrappedUsdPlusBalance, account, account);
        let usdPlusBalanceAfter = await usdPlus.balanceOf(account);
        expect(usdPlusBalanceAfter).to.equals(unwrappedAmount);

        expect(usdPlusBalanceBefore - usdPlusBalanceAfter).to.equals(0);
    });

});




