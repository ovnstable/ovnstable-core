const {expect} = require("chai");
const {deployments, ethers, getNamedAccounts} = require("hardhat");
const BN = require("bn.js");
const {constants} = require('@openzeppelin/test-helpers');
const {ZERO_ADDRESS} = constants;
const hre = require("hardhat");
const expectRevert = require("@overnight-contracts/common/utils/expectRevert");
let {POLYGON} = require('@overnight-contracts/common/utils/assets');
const {sharedBeforeEach} = require("@overnight-contracts/common/utils/sharedBeforeEach");


describe("StaticUsdPlusToken", function () {

    let account;
    let secondAccount;
    let usdPlus;
    let staticUsdPlus;
    let usdc;
    let market;
    let noMockUsdPlus;


    sharedBeforeEach('deploy and setup', async () => {
        // need to run inside IDEA via node script running
        await hre.run("compile");

        await deployments.fixture(['test', 'base', 'setting']);

        const {deployer} = await getNamedAccounts();
        account = deployer;
        const signers = await ethers.getSigners();
        secondAccount = signers[1];

        usdPlus = await ethers.getContract("MockUsdPlusToken");
        staticUsdPlus = await ethers.getContract("StaticUsdPlusToken");
        usdc = await ethers.getContractAt("ERC20", POLYGON.usdc);
        market = await ethers.getContract("Market");
        noMockUsdPlus = await ethers.getContractAt("ERC20", '0x236eeC6359fb44CCe8f97E99387aa7F8cd5cdE1f');

    });


    it("main token is usd+", async function () {

        let mainToken = await staticUsdPlus.mainToken();
        expect(mainToken.toString()).to.equals(usdPlus.address);

    });

    it("asset token is usd+", async function () {

        let assetToken = await staticUsdPlus.asset();
        expect(assetToken.toString()).to.equals(usdPlus.address);

    });

    it("rate same to usdPlus liquidity index", async function () {

        let liquidityIndex = new BN(10).pow(new BN(27)); // 10^27
        await usdPlus.setLiquidityIndex(liquidityIndex.toString());
        let rate = await staticUsdPlus.rate();
        expect(rate.toString()).to.equals(liquidityIndex.toString());

        liquidityIndex = liquidityIndex.subn(1000)
        await usdPlus.setLiquidityIndex(liquidityIndex.toString());
        rate = await staticUsdPlus.rate();
        expect(rate.toString()).to.equals(liquidityIndex.toString());

    });


    it("static to dynamic converting", async function () {

        let liquidityIndex = new BN(10).pow(new BN(27)); // 10^27
        await usdPlus.setLiquidityIndex(liquidityIndex.toString());

        let staticAmount = 1000;
        let dynamicAmount = await staticUsdPlus.staticToDynamicAmount(staticAmount);
        expect(dynamicAmount).to.equals(staticAmount);

        liquidityIndex = new BN(10).pow(new BN(27)).divn(2); // 5*10^26
        await usdPlus.setLiquidityIndex(liquidityIndex.toString());

        dynamicAmount = await staticUsdPlus.staticToDynamicAmount(staticAmount);
        expect(dynamicAmount).to.equals(500);

        liquidityIndex = new BN(10).pow(new BN(27)).muln(2); // 2*10^27
        await usdPlus.setLiquidityIndex(liquidityIndex.toString());

        dynamicAmount = await staticUsdPlus.staticToDynamicAmount(staticAmount);
        expect(dynamicAmount).to.equals(2000);

    });

    it("dynamic to static converting", async function () {

        let liquidityIndex = new BN(10).pow(new BN(27)); // 10^27
        await usdPlus.setLiquidityIndex(liquidityIndex.toString());

        let staticAmount = 1000;
        let dynamicAmount = await staticUsdPlus.dynamicToStaticAmount(staticAmount);
        expect(dynamicAmount).to.equals(staticAmount);

        liquidityIndex = new BN(10).pow(new BN(27)).divn(2); // 5*10^26
        await usdPlus.setLiquidityIndex(liquidityIndex.toString());

        dynamicAmount = await staticUsdPlus.dynamicToStaticAmount(staticAmount);
        expect(dynamicAmount).to.equals(2000);

        liquidityIndex = new BN(10).pow(new BN(27)).muln(2); // 2*10^27
        await usdPlus.setLiquidityIndex(liquidityIndex.toString());

        dynamicAmount = await staticUsdPlus.dynamicToStaticAmount(staticAmount);
        expect(dynamicAmount).to.equals(500);

    });

    it("dynamic<->static converting", async function () {

        let liquidityIndex = new BN(10).pow(new BN(27)); // 10^27
        await usdPlus.setLiquidityIndex(liquidityIndex.toString());

        let staticAmount = 1000;
        let dynamicAmount = await staticUsdPlus.dynamicToStaticAmount(staticAmount);
        let newStaticAmount = await staticUsdPlus.staticToDynamicAmount(dynamicAmount);
        expect(newStaticAmount).to.equals(staticAmount);

        liquidityIndex = new BN(10).pow(new BN(27)).divn(2); // 5*10^26
        await usdPlus.setLiquidityIndex(liquidityIndex.toString());

        dynamicAmount = await staticUsdPlus.dynamicToStaticAmount(staticAmount);
        newStaticAmount = await staticUsdPlus.staticToDynamicAmount(dynamicAmount);
        expect(newStaticAmount).to.equals(staticAmount);

        liquidityIndex = new BN(10).pow(new BN(27)).muln(2); // 2*10^27
        await usdPlus.setLiquidityIndex(liquidityIndex.toString());

        dynamicAmount = await staticUsdPlus.dynamicToStaticAmount(staticAmount);
        newStaticAmount = await staticUsdPlus.staticToDynamicAmount(dynamicAmount);
        expect(newStaticAmount).to.equals(staticAmount);

    });


    it("dynamic balance", async function () {

        let liquidityIndex = new BN(10).pow(new BN(27)).muln(2); // 2*10^27
        await usdPlus.setLiquidityIndex(liquidityIndex.toString());

        let usdPlusAmountToWrap = 250;
        let usdcAmountToDeposit = 1000;
        // 500 USD+ minted with liquidityIndex = 2*10^27
        await usdPlus.mint(account, usdcAmountToDeposit);

        await usdPlus.approve(staticUsdPlus.address, usdPlusAmountToWrap);

        // call again to change state
        await staticUsdPlus.deposit(usdPlusAmountToWrap, account);

        expect(await staticUsdPlus.balanceOf(account)).to.equals(usdPlusAmountToWrap / 2);
        expect(await staticUsdPlus.dynamicBalanceOf(account)).to.equals(usdPlusAmountToWrap);

    });

    it("deposit 1:1", async function () {
        let liquidityIndex = new BN(10).pow(new BN(27)); // 10^27
        await usdPlus.setLiquidityIndex(liquidityIndex.toString());

        await expectRevert(
            staticUsdPlus.callStatic.deposit(1, ZERO_ADDRESS),
            'Zero address for receiver not allowed',
        );

        await expectRevert(
            staticUsdPlus.callStatic.deposit(0, account),
            'Zero assets not allowed',
        );

        let usdcAmountToDeposit = 250;

        await expectRevert(
            staticUsdPlus.callStatic.deposit(usdcAmountToDeposit, account),
            'ERC20: transfer amount exceeds balance',
        );

        expect(await usdPlus.balanceOf(staticUsdPlus.address)).to.equals(0);
        expect(await usdPlus.balanceOf(account)).to.equals(0);
        expect(await staticUsdPlus.balanceOf(account)).to.equals(0);

        await usdPlus.mint(account, usdcAmountToDeposit);
        await usdPlus.approve(staticUsdPlus.address, usdcAmountToDeposit);

        // callStatic doesn't change state but return value
        let mintedStaticAmount = await staticUsdPlus.callStatic.deposit(usdcAmountToDeposit, account);
        expect(mintedStaticAmount.toString()).to.equals(String(usdcAmountToDeposit));

        // call again to change state
        let receipt = await (await staticUsdPlus.deposit(usdcAmountToDeposit, account)).wait();

        const depositEvent = receipt.events.find((e) => e.event === 'Deposit' && e.args[0] === account);
        expect(depositEvent.args[3].toString()).to.equals(String(mintedStaticAmount));

        expect(await usdPlus.balanceOf(staticUsdPlus.address)).to.equals(usdcAmountToDeposit);
        expect(await usdPlus.balanceOf(account)).to.equals(0);
        expect(await staticUsdPlus.balanceOf(account)).to.equals(mintedStaticAmount);

    });

    it("redeem 1:1", async function () {

        let liquidityIndex = new BN(10).pow(new BN(27)); // 10^27
        await usdPlus.setLiquidityIndex(liquidityIndex.toString());


        await expectRevert(
            staticUsdPlus.callStatic.redeem(1, ZERO_ADDRESS, account),
            'Zero address for receiver not allowed',
        );

        await expectRevert(
            staticUsdPlus.callStatic.redeem(1, account, ZERO_ADDRESS),
            'Zero address for owner not allowed',
        );

        await expectRevert(
            staticUsdPlus.callStatic.redeem(0, account, account),
            'Zero shares not allowed',
        );

        let usdcAmountToDeposit = 250;

        expect(await usdPlus.balanceOf(staticUsdPlus.address)).to.equals(0);
        expect(await usdPlus.balanceOf(account)).to.equals(0);
        expect(await staticUsdPlus.balanceOf(account)).to.equals(0);

        await usdPlus.mint(account, usdcAmountToDeposit);
        await usdPlus.approve(staticUsdPlus.address, usdcAmountToDeposit);

        // callStatic doesn't change state but return value
        let mintedStaticAmount = await staticUsdPlus.callStatic.deposit(usdcAmountToDeposit, account);
        expect(mintedStaticAmount.toString()).to.equals(String(usdcAmountToDeposit));

        // call again to change state
        await (await staticUsdPlus.deposit(usdcAmountToDeposit, account)).wait();

        expect(await usdPlus.balanceOf(staticUsdPlus.address)).to.equals(usdcAmountToDeposit);
        expect(await usdPlus.balanceOf(account)).to.equals(0);
        expect(await staticUsdPlus.balanceOf(account)).to.equals(mintedStaticAmount);

        // callStatic doesn't change state but return value
        let transferredDynamicAmount = await staticUsdPlus.callStatic.redeem(usdcAmountToDeposit, account, account);
        expect(transferredDynamicAmount.toString()).to.equals(String(usdcAmountToDeposit));

        let usdPlusBalanceBefore = await usdPlus.balanceOf(account);

        // call again to change state
        let receipt = await (await staticUsdPlus.redeem(usdcAmountToDeposit, account, account)).wait();

        const depositEvent = receipt.events.find((e) => e.event === 'Withdraw' && e.args[0] === account);
        expect(depositEvent.args[3].toString()).to.equals(String(transferredDynamicAmount));

        expect(await usdPlus.balanceOf(staticUsdPlus.address)).to.equals(0);
        expect(await staticUsdPlus.balanceOf(account)).to.equals(0);

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
            staticUsdPlus.callStatic.redeem(usdcAmountToDeposit, account, tmpUser.address),
            'Redeem amount exceeds allowance',
        );

        await usdPlus.mint(account, usdcAmountToDeposit);
        await usdPlus.approve(staticUsdPlus.address, usdcAmountToDeposit);

        // call again to change state
        await (await staticUsdPlus.deposit(usdcAmountToDeposit, tmpUser.address)).wait();

        expect(await usdPlus.balanceOf(staticUsdPlus.address)).to.equals(usdcAmountToDeposit);
        expect(await usdPlus.balanceOf(account)).to.equals(0);
        expect(await staticUsdPlus.balanceOf(tmpUser.address)).to.equals(usdcAmountToDeposit);

        await staticUsdPlus.connect(tmpUser).approve(account, usdcAmountToDeposit);
        expect(await staticUsdPlus.allowance(tmpUser.address, account)).to.equals(usdcAmountToDeposit);

        // callStatic doesn't change state but return value
        let transferredDynamicAmount = await staticUsdPlus.callStatic.redeem(usdcAmountToDeposit, account, tmpUser.address);
        expect(transferredDynamicAmount.toString()).to.equals(String(usdcAmountToDeposit));

        let usdPlusBalanceBefore = await usdPlus.balanceOf(account);

        // call again to change state
        let receipt = await (await staticUsdPlus.redeem(usdcAmountToDeposit, account, tmpUser.address)).wait();

        expect(await usdPlus.balanceOf(staticUsdPlus.address)).to.equals(0);
        expect(await staticUsdPlus.balanceOf(account)).to.equals(0);
        expect(await staticUsdPlus.balanceOf(tmpUser.address)).to.equals(0);
        expect(await staticUsdPlus.allowance(tmpUser.address, account)).to.equals(0);

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

        expect(await staticUsdPlus.totalAssets()).to.equals(0);
        expect(await staticUsdPlus.assetsOf(account)).to.equals(0);

        await usdPlus.mint(account, usdcAmountToDeposit);
        await usdPlus.approve(staticUsdPlus.address, usdcAmountToDeposit);

        let mintedStaticAmount = await staticUsdPlus.callStatic.deposit(usdcAmountToDeposit, account);
        await staticUsdPlus.deposit(usdcAmountToDeposit, account);

        expect(await staticUsdPlus.balanceOf(account)).to.equals(mintedStaticAmount);
        expect(await staticUsdPlus.totalAssets()).to.equals(usdcAmountToDeposit);

    });


    it("assetsOf", async function () {

        let liquidityIndex = new BN(10).pow(new BN(27)); // 10^27
        await usdPlus.setLiquidityIndex(liquidityIndex.toString());

        let usdcAmountToDeposit = 250;

        expect(await staticUsdPlus.totalAssets()).to.equals(0);
        expect(await staticUsdPlus.assetsOf(account)).to.equals(0);

        await usdPlus.mint(account, usdcAmountToDeposit);
        await usdPlus.approve(staticUsdPlus.address, usdcAmountToDeposit);

        // call again to change state
        await staticUsdPlus.deposit(usdcAmountToDeposit, account);

        expect(await staticUsdPlus.totalAssets()).to.equals(usdcAmountToDeposit);
        expect(await staticUsdPlus.assetsOf(account)).to.equals(usdcAmountToDeposit);

    });


    it("market test", async function () {

        await usdc.transfer(secondAccount.address, 100000000);

        expect(await usdc.balanceOf(secondAccount.address)).to.equals(100000000);
        expect(await staticUsdPlus.balanceOf(secondAccount.address)).to.equals(0);
        await usdc.connect(secondAccount).approve(market.address, 100000000);
        await market.connect(secondAccount).wrap(usdc.address, 100000000, secondAccount.address);
        expect(await staticUsdPlus.balanceOf(secondAccount.address)).to.equals(95637103);
        expect(await usdc.balanceOf(secondAccount.address)).to.equals(0);

        await staticUsdPlus.connect(secondAccount).approve(market.address, 95637103);
        await market.connect(secondAccount).unwrap(usdc.address, 95637103, secondAccount.address);
        expect(await staticUsdPlus.balanceOf(secondAccount.address)).to.equals(0);
        expect(await usdc.balanceOf(secondAccount.address)).to.equals(99920016);
    });

});




