const {expect} = require("chai");
const chai = require("chai");
const {deployments, ethers, getNamedAccounts} = require("hardhat");
const {smock} = require("@defi-wonderland/smock");
const BN = require("bn.js");
const {constants} = require('@openzeppelin/test-helpers');
const {ZERO_ADDRESS} = constants;

const hre = require("hardhat");
const expectRevert = require("../../common/utils/expectRevert");
let {POLYGON} = require('../../common/utils/assets');
chai.use(smock.matchers);


async function setLiquidityIndex(account, usdPlus, liquidityIndex) {
    let prevExchanger = await usdPlus.callStatic.exchange();
    await usdPlus.setExchanger(account);
    await usdPlus.setLiquidityIndex(liquidityIndex.toString());
    await usdPlus.setExchanger(prevExchanger);
}

async function mint(account, usdPlus, amountToMint) {
    let prevExchanger = await usdPlus.callStatic.exchange();
    await usdPlus.setExchanger(account);
    await usdPlus.mint(account, amountToMint);
    await usdPlus.setExchanger(prevExchanger);
}


describe("StaticUsdPlusToken", function () {

    let account;
    let secondAccount;
    let usdPlus;
    let staticUsdPlus;
    let usdc;


    beforeEach(async () => {
        // need to run inside IDEA via node script running
        await hre.run("compile");

        await deployments.fixture(["setting", "base", "StaticUsdPlusToken", "test", "SettingUsdPlusToken", "SettingExchange"]);

        const {deployer, anotherAccount} = await getNamedAccounts();
        account = deployer;
        secondAccount = anotherAccount;
        usdPlus = await ethers.getContract("UsdPlusToken");
        staticUsdPlus = await ethers.getContract("StaticUsdPlusToken");
        usdc = await ethers.getContractAt("ERC20", POLYGON.usdc);

        const pm = await ethers.getContract("PortfolioManager");

        // only aave strategy for tests
        let weights = [{
            strategy: (await ethers.getContract("MockStrategy")).address,
            minWeight: 0,
            targetWeight: 100000,
            maxWeight: 100000,
            enabled: true,
            enabledReward: true,
        }]

        await pm.setStrategyWeights(weights);
    });


    it("main token is usdToken", async function () {

        let mainToken = await staticUsdPlus.mainToken();
        expect(mainToken.toString()).to.equals(usdPlus.address);

    });

    it("asset token is usdToken", async function () {

        let assetToken = await staticUsdPlus.asset();
        expect(assetToken.toString()).to.equals(usdPlus.address);

    });

    it("rate same to usdPlus liquidity index", async function () {

        let liquidityIndex = new BN(10).pow(new BN(27)); // 10^27
        await setLiquidityIndex(account, usdPlus, liquidityIndex);
        let rate = await staticUsdPlus.rate();
        expect(rate.toString()).to.equals(liquidityIndex.toString());

        liquidityIndex = liquidityIndex.subn(1000)
        await setLiquidityIndex(account, usdPlus, liquidityIndex);
        rate = await staticUsdPlus.rate();
        expect(rate.toString()).to.equals(liquidityIndex.toString());

    });


    it("static to dynamic converting", async function () {

        let liquidityIndex = new BN(10).pow(new BN(27)); // 10^27
        await setLiquidityIndex(account, usdPlus, liquidityIndex);

        let staticAmount = 1000;
        let dynamicAmount = await staticUsdPlus.staticToDynamicAmount(staticAmount);
        expect(dynamicAmount).to.equals(staticAmount);

        liquidityIndex = new BN(10).pow(new BN(27)).divn(2); // 5*10^26
        await setLiquidityIndex(account, usdPlus, liquidityIndex);

        dynamicAmount = await staticUsdPlus.staticToDynamicAmount(staticAmount);
        expect(dynamicAmount).to.equals(500);

        liquidityIndex = new BN(10).pow(new BN(27)).muln(2); // 2*10^27
        await setLiquidityIndex(account, usdPlus, liquidityIndex);

        dynamicAmount = await staticUsdPlus.staticToDynamicAmount(staticAmount);
        expect(dynamicAmount).to.equals(2000);

    });

    it("dynamic to static converting", async function () {

        let liquidityIndex = new BN(10).pow(new BN(27)); // 10^27
        await setLiquidityIndex(account, usdPlus, liquidityIndex);

        let staticAmount = 1000;
        let dynamicAmount = await staticUsdPlus.dynamicToStaticAmount(staticAmount);
        expect(dynamicAmount).to.equals(staticAmount);

        liquidityIndex = new BN(10).pow(new BN(27)).divn(2); // 5*10^26
        await setLiquidityIndex(account, usdPlus, liquidityIndex);

        dynamicAmount = await staticUsdPlus.dynamicToStaticAmount(staticAmount);
        expect(dynamicAmount).to.equals(2000);

        liquidityIndex = new BN(10).pow(new BN(27)).muln(2); // 2*10^27
        await setLiquidityIndex(account, usdPlus, liquidityIndex);

        dynamicAmount = await staticUsdPlus.dynamicToStaticAmount(staticAmount);
        expect(dynamicAmount).to.equals(500);

    });

    it("dynamic<->static converting", async function () {

        let liquidityIndex = new BN(10).pow(new BN(27)); // 10^27
        await setLiquidityIndex(account, usdPlus, liquidityIndex);

        let staticAmount = 1000;
        let dynamicAmount = await staticUsdPlus.dynamicToStaticAmount(staticAmount);
        let newStaticAmount = await staticUsdPlus.staticToDynamicAmount(dynamicAmount);
        expect(newStaticAmount).to.equals(staticAmount);

        liquidityIndex = new BN(10).pow(new BN(27)).divn(2); // 5*10^26
        await setLiquidityIndex(account, usdPlus, liquidityIndex);

        dynamicAmount = await staticUsdPlus.dynamicToStaticAmount(staticAmount);
        newStaticAmount = await staticUsdPlus.staticToDynamicAmount(dynamicAmount);
        expect(newStaticAmount).to.equals(staticAmount);

        liquidityIndex = new BN(10).pow(new BN(27)).muln(2); // 2*10^27
        await setLiquidityIndex(account, usdPlus, liquidityIndex);

        dynamicAmount = await staticUsdPlus.dynamicToStaticAmount(staticAmount);
        newStaticAmount = await staticUsdPlus.staticToDynamicAmount(dynamicAmount);
        expect(newStaticAmount).to.equals(staticAmount);

    });


    it("dynamic balance", async function () {

        let liquidityIndex = new BN(10).pow(new BN(27)).muln(2); // 2*10^27
        await setLiquidityIndex(account, usdPlus, liquidityIndex);

        let usdPlusAmountToWrap = 250;
        let startUsdPlusBalance = 1000;
        await mint(account, usdPlus, startUsdPlusBalance);

        await usdPlus.approve(staticUsdPlus.address, usdPlusAmountToWrap);

        // call again to change state
        await staticUsdPlus.deposit(usdPlusAmountToWrap, account);

        expect(await staticUsdPlus.balanceOf(account)).to.equals(usdPlusAmountToWrap / 2);
        expect(await staticUsdPlus.dynamicBalanceOf(account)).to.equals(usdPlusAmountToWrap);

    });

    it("deposit 1:1", async function () {
        let liquidityIndex = new BN(10).pow(new BN(27)); // 10^27
        await setLiquidityIndex(account, usdPlus, liquidityIndex);

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

        await mint(account, usdPlus, usdcAmountToDeposit);
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
        await setLiquidityIndex(account, usdPlus, liquidityIndex);


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

        await mint(account, usdPlus, usdcAmountToDeposit);
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
        await setLiquidityIndex(account, usdPlus, liquidityIndex);

        let usdcAmountToDeposit = 250;
        await expectRevert(
            staticUsdPlus.callStatic.redeem(usdcAmountToDeposit, account, tmpUser.address),
            'Redeem amount exceeds allowance',
        );

        await mint(account, usdPlus, usdcAmountToDeposit);
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
        await setLiquidityIndex(account, usdPlus, liquidityIndex);

        let usdcAmountToDeposit = 250;

        expect(await staticUsdPlus.totalAssets()).to.equals(0);
        expect(await staticUsdPlus.assetsOf(account)).to.equals(0);

        await mint(account, usdPlus, usdcAmountToDeposit);
        await usdPlus.approve(staticUsdPlus.address, usdcAmountToDeposit);

        let mintedStaticAmount = await staticUsdPlus.callStatic.deposit(usdcAmountToDeposit, account);
        await staticUsdPlus.deposit(usdcAmountToDeposit, account);

        expect(await staticUsdPlus.balanceOf(account)).to.equals(mintedStaticAmount);
        expect(await staticUsdPlus.totalAssets()).to.equals(usdcAmountToDeposit);

    });


    it("assetsOf", async function () {

        let liquidityIndex = new BN(10).pow(new BN(27)); // 10^27
        await setLiquidityIndex(account, usdPlus, liquidityIndex);

        let usdcAmountToDeposit = 250;

        expect(await staticUsdPlus.totalAssets()).to.equals(0);
        expect(await staticUsdPlus.assetsOf(account)).to.equals(0);

        await mint(account, usdPlus, usdcAmountToDeposit);
        await usdPlus.approve(staticUsdPlus.address, usdcAmountToDeposit);

        // call again to change state
        await staticUsdPlus.deposit(usdcAmountToDeposit, account);

        expect(await staticUsdPlus.totalAssets()).to.equals(usdcAmountToDeposit);
        expect(await staticUsdPlus.assetsOf(account)).to.equals(usdcAmountToDeposit);

    });

});




