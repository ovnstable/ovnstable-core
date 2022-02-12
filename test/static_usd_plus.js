const {expect} = require("chai");
const chai = require("chai");
const {deployments, ethers, getNamedAccounts} = require("hardhat");
const {smock} = require("@defi-wonderland/smock");
const BN = require("bn.js");
const {constants} = require('@openzeppelin/test-helpers');
const {ZERO_ADDRESS} = constants;

const hre = require("hardhat");
const expectRevert = require("../utils/expectRevert");
const fs = require("fs");
const {toUSDC, fromUSDC} = require("../utils/decimals");
let assets = JSON.parse(fs.readFileSync('./assets.json'));

chai.use(smock.matchers);


async function setLiquidityIndex(account, usdPlus, liquidityIndex) {
    let prevExchanger = await usdPlus.callStatic.exchange();
    // console.log("Save previous exchanger: " + prevExchanger);
    await usdPlus.setExchanger(account);
    // console.log("Set exchanger to: " + account);
    await usdPlus.setLiquidityIndex(liquidityIndex.toString());
    await usdPlus.setExchanger(prevExchanger);
    // console.log("Back exchanger to: " + prevExchanger);
}

async function mint(account, usdPlus, amountToMint) {
    let prevExchanger = await usdPlus.callStatic.exchange();
    // console.log("Save previous exchanger: " + prevExchanger);
    await usdPlus.setExchanger(account);
    // console.log("Set exchanger to: " + account);
    await usdPlus.mint(account, amountToMint);
    await usdPlus.setExchanger(prevExchanger);
    // console.log("Back exchanger to: " + prevExchanger);
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

        await deployments.fixture(["setting", "base", "StaticUsdPlusToken", "BuyUsdc"]);

        const {deployer, anotherAccount} = await getNamedAccounts();
        account = deployer;
        secondAccount = anotherAccount;
        usdPlus = await ethers.getContract("UsdPlusToken");
        staticUsdPlus = await ethers.getContract("StaticUsdPlusToken");
        usdc = await ethers.getContractAt("ERC20", assets.usdc);

        const pm = await ethers.getContract("PortfolioManager");
        const exchange = await ethers.getContract("Exchange");

        // only aave strategy for tests
        let weights = [{
            strategy: (await ethers.getContract("StrategyAave")).address,
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

    it("asset token is usdc", async function () {

        let assetToken = await staticUsdPlus.asset();
        expect(assetToken.toString().toLowerCase()).to.equals(assets.usdc.toString().toLowerCase());

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

    it("assetsPerShare correspond to usdPlus liquidity index", async function () {

        let liquidityIndex = new BN(10).pow(new BN(27)); // 10^27
        await setLiquidityIndex(account, usdPlus, liquidityIndex);
        let assetsPerShare = await staticUsdPlus.assetsPerShare();
        expect(assetsPerShare.toString()).to.equals(new BN(10).pow(new BN(6)).toString());

        liquidityIndex = new BN(10).pow(new BN(27)).muln(2);
        await setLiquidityIndex(account, usdPlus, liquidityIndex);
        assetsPerShare = await staticUsdPlus.assetsPerShare();
        expect(assetsPerShare.toString()).to.equals(new BN(10).pow(new BN(6)).muln(2).toString());

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

    it("wrapping 1:1", async function () {

        let liquidityIndex = new BN(10).pow(new BN(27)); // 10^27
        await setLiquidityIndex(account, usdPlus, liquidityIndex);


        await expectRevert(
            staticUsdPlus.callStatic.wrap(ZERO_ADDRESS, 1),
            'Zero address for recipient not allowed',
        );

        await expectRevert(
            staticUsdPlus.callStatic.wrap(account, 0),
            'Zero amount not allowed',
        );

        let usdPlusAmountToWrap = 250;
        let startUsdPlusBalance = 1000;
        await mint(account, usdPlus, startUsdPlusBalance);

        await expectRevert(
            staticUsdPlus.callStatic.wrap(account, usdPlusAmountToWrap),
            'UsdPlusToken: transfer amount exceeds allowance',
        );

        expect(await usdPlus.balanceOf(staticUsdPlus.address)).to.equals(0);
        expect(await usdPlus.balanceOf(account)).to.equals(startUsdPlusBalance);
        expect(await staticUsdPlus.balanceOf(account)).to.equals(0);

        await usdPlus.approve(staticUsdPlus.address, usdPlusAmountToWrap);

        // callStatic doesn't change state but return value
        let mintedStaticAmount = await staticUsdPlus.callStatic.wrap(account, usdPlusAmountToWrap);
        expect(mintedStaticAmount.toString()).to.equals(String(usdPlusAmountToWrap));

        // call again to change state
        let receipt = await (await staticUsdPlus.wrap(account, usdPlusAmountToWrap)).wait();

        const mintEvent = receipt.events.find((e) => e.event === 'Transfer' && e.args[0] === ZERO_ADDRESS);
        expect(mintEvent.args[2].toString()).to.equals(String(mintedStaticAmount));

        expect(await usdPlus.balanceOf(staticUsdPlus.address)).to.equals(usdPlusAmountToWrap);
        expect(await usdPlus.balanceOf(account)).to.equals(startUsdPlusBalance - usdPlusAmountToWrap);
        expect(await staticUsdPlus.balanceOf(account)).to.equals(mintedStaticAmount);

    });

    it("wrapping 1:2", async function () {

        let liquidityIndex = new BN(10).pow(new BN(27)).muln(2); // 2*10^27
        await setLiquidityIndex(account, usdPlus, liquidityIndex);

        let usdPlusAmountToWrap = 250;
        let startUsdPlusBalance = 1000;
        await mint(account, usdPlus, startUsdPlusBalance);

        expect(await usdPlus.balanceOf(staticUsdPlus.address)).to.equals(0);
        expect(await usdPlus.balanceOf(account)).to.equals(startUsdPlusBalance);
        expect(await staticUsdPlus.balanceOf(account)).to.equals(0);

        await usdPlus.approve(staticUsdPlus.address, usdPlusAmountToWrap);

        // callStatic doesn't change state but return value
        let mintedStaticAmount = await staticUsdPlus.callStatic.wrap(account, usdPlusAmountToWrap);
        expect(mintedStaticAmount.toString()).to.equals(String(usdPlusAmountToWrap / 2));

        // call again to change state
        let receipt = await (await staticUsdPlus.wrap(account, usdPlusAmountToWrap)).wait();

        const mintEvent = receipt.events.find((e) => e.event === 'Transfer' && e.args[0] === ZERO_ADDRESS);
        expect(mintEvent.args[2].toString()).to.equals(String(mintedStaticAmount));

        expect(await usdPlus.balanceOf(staticUsdPlus.address)).to.equals(usdPlusAmountToWrap);
        expect(await usdPlus.balanceOf(account)).to.equals(startUsdPlusBalance - usdPlusAmountToWrap);
        expect(await staticUsdPlus.balanceOf(account)).to.equals(usdPlusAmountToWrap / 2);

    });

    it("wrapping 1:1 and 1:2", async function () {

        let liquidityIndex = new BN(10).pow(new BN(27)); // 10^27
        await setLiquidityIndex(account, usdPlus, liquidityIndex);

        let usdPlusAmountToWrap = 250;
        let startUsdPlusBalance = 1000;
        await mint(account, usdPlus, startUsdPlusBalance);

        expect(await usdPlus.balanceOf(staticUsdPlus.address)).to.equals(0);
        expect(await usdPlus.balanceOf(account)).to.equals(startUsdPlusBalance);
        expect(await staticUsdPlus.balanceOf(account)).to.equals(0);

        await usdPlus.approve(staticUsdPlus.address, usdPlusAmountToWrap);

        // callStatic doesn't change state but return value
        let mintedStaticAmount = await staticUsdPlus.callStatic.wrap(account, usdPlusAmountToWrap);
        expect(mintedStaticAmount.toString()).to.equals(String(usdPlusAmountToWrap));

        // call again to change state
        let receipt = await (await staticUsdPlus.wrap(account, usdPlusAmountToWrap)).wait();
        let mintEvent = receipt.events.find((e) => e.event === 'Transfer' && e.args[0] === ZERO_ADDRESS);
        expect(mintEvent.args[2].toString()).to.equals(String(mintedStaticAmount));

        expect(await usdPlus.balanceOf(staticUsdPlus.address)).to.equals(usdPlusAmountToWrap);
        expect(await usdPlus.balanceOf(account)).to.equals(startUsdPlusBalance - usdPlusAmountToWrap);
        expect(await staticUsdPlus.balanceOf(account)).to.equals(mintedStaticAmount);


        // change LI 1:2
        liquidityIndex = new BN(10).pow(new BN(27)).muln(2); // 2*10^27
        await setLiquidityIndex(account, usdPlus, liquidityIndex);

        // x2 on usdPlus after LI change
        expect(await usdPlus.balanceOf(staticUsdPlus.address)).to.equals(2 * usdPlusAmountToWrap);
        expect(await usdPlus.balanceOf(account)).to.equals(2 * (startUsdPlusBalance - usdPlusAmountToWrap));
        expect(await staticUsdPlus.balanceOf(account)).to.equals(mintedStaticAmount);


        await usdPlus.approve(staticUsdPlus.address, usdPlusAmountToWrap);

        // callStatic doesn't change state but return value
        let mintedStaticAmount2 = await staticUsdPlus.callStatic.wrap(account, usdPlusAmountToWrap);
        expect(mintedStaticAmount2.toString()).to.equals(String(usdPlusAmountToWrap / 2));

        // call again to change state
        receipt = await (await staticUsdPlus.wrap(account, usdPlusAmountToWrap)).wait();
        mintEvent = receipt.events.find((e) => e.event === 'Transfer' && e.args[0] === ZERO_ADDRESS);
        expect(mintEvent.args[2].toString()).to.equals(String(mintedStaticAmount2));

        expect(await usdPlus.balanceOf(staticUsdPlus.address)).to.equals(3 * usdPlusAmountToWrap);
        expect(await usdPlus.balanceOf(account)).to.equals(2 * (startUsdPlusBalance - usdPlusAmountToWrap) - usdPlusAmountToWrap);
        expect(await staticUsdPlus.balanceOf(account)).to.equals(mintedStaticAmount.add(mintedStaticAmount2));

    });


    it("unwrapping 1:1", async function () {

        let liquidityIndex = new BN(10).pow(new BN(27)); // 10^27
        await setLiquidityIndex(account, usdPlus, liquidityIndex);


        await expectRevert(
            staticUsdPlus.callStatic.unwrap(ZERO_ADDRESS, 1),
            'Zero address for recipient not allowed',
        );

        await expectRevert(
            staticUsdPlus.callStatic.unwrap(account, 0),
            'Zero amount not allowed',
        );

        let staticUsdPlusAmountToUnwrap = 250;
        await expectRevert(
            staticUsdPlus.callStatic.unwrap(account, staticUsdPlusAmountToUnwrap),
            'ERC20: burn amount exceeds balance',
        );

        let startUsdPlusBalance = 1000;
        await mint(account, usdPlus, startUsdPlusBalance);
        await usdPlus.approve(staticUsdPlus.address, staticUsdPlusAmountToUnwrap);
        await staticUsdPlus.wrap(account, staticUsdPlusAmountToUnwrap);

        expect(await usdPlus.balanceOf(staticUsdPlus.address)).to.equals(staticUsdPlusAmountToUnwrap);
        expect(await usdPlus.balanceOf(account)).to.equals(startUsdPlusBalance - staticUsdPlusAmountToUnwrap);
        expect(await staticUsdPlus.balanceOf(account)).to.equals(staticUsdPlusAmountToUnwrap);

        // callStatic doesn't change state but return value
        let [burnedStaticAmount, transferredDynamicAmount] = await staticUsdPlus.callStatic.unwrap(account, staticUsdPlusAmountToUnwrap);
        expect(burnedStaticAmount.toString()).to.equals(String(staticUsdPlusAmountToUnwrap));
        expect(transferredDynamicAmount.toString()).to.equals(String(staticUsdPlusAmountToUnwrap));

        // call again to change state
        let receipt = await (await staticUsdPlus.unwrap(account, staticUsdPlusAmountToUnwrap)).wait();

        const burnEvent = receipt.events.find((e) => e.event === 'Transfer' && e.args[1] === ZERO_ADDRESS);
        expect(burnEvent.args[2].toString()).to.equals(String(burnedStaticAmount));

        expect(await usdPlus.balanceOf(staticUsdPlus.address)).to.equals(0);
        expect(await usdPlus.balanceOf(account)).to.equals(startUsdPlusBalance);
        expect(await staticUsdPlus.balanceOf(account)).to.equals(0);

    });

    it("unwrapping 1:2", async function () {

        let liquidityIndex = new BN(10).pow(new BN(27)).muln(2); // 2*10^27
        await setLiquidityIndex(account, usdPlus, liquidityIndex);

        let staticUsdPlusAmountToUnwrap = 250;
        let startUsdPlusBalance = 1000;
        await mint(account, usdPlus, startUsdPlusBalance);
        await usdPlus.approve(staticUsdPlus.address, staticUsdPlusAmountToUnwrap);
        await staticUsdPlus.wrap(account, staticUsdPlusAmountToUnwrap);

        expect(await usdPlus.balanceOf(staticUsdPlus.address)).to.equals(staticUsdPlusAmountToUnwrap);
        expect(await usdPlus.balanceOf(account)).to.equals(startUsdPlusBalance - staticUsdPlusAmountToUnwrap);
        expect(await staticUsdPlus.balanceOf(account)).to.equals(staticUsdPlusAmountToUnwrap / 2);

        // callStatic doesn't change state but return value
        let [burnedStaticAmount, transferredDynamicAmount] = await staticUsdPlus.callStatic.unwrap(account, staticUsdPlusAmountToUnwrap / 2);
        expect(burnedStaticAmount.toString()).to.equals(String(staticUsdPlusAmountToUnwrap / 2));
        expect(transferredDynamicAmount.toString()).to.equals(String(staticUsdPlusAmountToUnwrap));

        // call again to change state
        let receipt = await (await staticUsdPlus.unwrap(account, staticUsdPlusAmountToUnwrap / 2)).wait();

        const burnEvent = receipt.events.find((e) => e.event === 'Transfer' && e.args[1] === ZERO_ADDRESS);
        expect(burnEvent.args[2].toString()).to.equals(String(burnedStaticAmount));

        expect(await usdPlus.balanceOf(staticUsdPlus.address)).to.equals(0);
        expect(await usdPlus.balanceOf(account)).to.equals(startUsdPlusBalance);
        expect(await staticUsdPlus.balanceOf(account)).to.equals(0);

    });

    it("wrap/unwrap 1:1->1:2->1:1", async function () {

        let liquidityIndex = new BN(10).pow(new BN(27)); // 10^27
        await setLiquidityIndex(account, usdPlus, liquidityIndex);

        let usdPlusAmountToWrap = 250;
        let startUsdPlusBalance = 1000;
        await mint(account, usdPlus, startUsdPlusBalance);

        await usdPlus.approve(staticUsdPlus.address, usdPlusAmountToWrap);

        // callStatic doesn't change state but return value
        let mintedStaticAmount = await staticUsdPlus.callStatic.wrap(account, usdPlusAmountToWrap);
        await staticUsdPlus.wrap(account, usdPlusAmountToWrap);

        // change LI 1:2
        liquidityIndex = new BN(10).pow(new BN(27)).muln(2); // 2*10^27
        await setLiquidityIndex(account, usdPlus, liquidityIndex);

        // x2 on usdPlus after LI change
        await usdPlus.approve(staticUsdPlus.address, usdPlusAmountToWrap);

        // callStatic doesn't change state but return value
        let mintedStaticAmount2 = await staticUsdPlus.callStatic.wrap(account, usdPlusAmountToWrap);
        await staticUsdPlus.wrap(account, usdPlusAmountToWrap);

        expect(await usdPlus.balanceOf(staticUsdPlus.address)).to.equals(3 * usdPlusAmountToWrap);
        expect(await usdPlus.balanceOf(account)).to.equals(2 * (startUsdPlusBalance - usdPlusAmountToWrap) - usdPlusAmountToWrap);
        expect(await staticUsdPlus.balanceOf(account)).to.equals(mintedStaticAmount.add(mintedStaticAmount2));

        // change LI 1:1
        liquidityIndex = new BN(10).pow(new BN(27)); // 10^27
        await setLiquidityIndex(account, usdPlus, liquidityIndex);

        let staticUsdPlusUsdPlusAmountBalance = 3 * usdPlusAmountToWrap / 2;
        let userUsdPlusAmountBalance = (2 * (startUsdPlusBalance - usdPlusAmountToWrap) - usdPlusAmountToWrap) / 2;
        let userStaticUsdPlusAmountBalance = mintedStaticAmount.add(mintedStaticAmount2);

        expect(await usdPlus.balanceOf(staticUsdPlus.address)).to.equals(staticUsdPlusUsdPlusAmountBalance);
        expect(await usdPlus.balanceOf(account)).to.equals(userUsdPlusAmountBalance);
        expect(await staticUsdPlus.balanceOf(account)).to.equals(userStaticUsdPlusAmountBalance);


        // unwrap

        // callStatic doesn't change state but return value
        let [burnedStaticAmount, transferredDynamicAmount] = await staticUsdPlus.callStatic.unwrap(account, userStaticUsdPlusAmountBalance);
        expect(burnedStaticAmount.toString()).to.equals(String(userStaticUsdPlusAmountBalance));
        expect(transferredDynamicAmount.toString()).to.equals(String(userStaticUsdPlusAmountBalance));

        // call again to change state
        receipt = await (await staticUsdPlus.unwrap(account, userStaticUsdPlusAmountBalance)).wait();

        const burnEvent = receipt.events.find((e) => e.event === 'Transfer' && e.args[1] === ZERO_ADDRESS);
        expect(burnEvent.args[2].toString()).to.equals(String(burnedStaticAmount));

        expect(await usdPlus.balanceOf(staticUsdPlus.address)).to.equals(0);
        expect(await usdPlus.balanceOf(account)).to.equals(startUsdPlusBalance);
        expect(await staticUsdPlus.balanceOf(account)).to.equals(0);

    });


    it("dynamic balance", async function () {

        let liquidityIndex = new BN(10).pow(new BN(27)).muln(2); // 2*10^27
        await setLiquidityIndex(account, usdPlus, liquidityIndex);

        let usdPlusAmountToWrap = 250;
        let startUsdPlusBalance = 1000;
        await mint(account, usdPlus, startUsdPlusBalance);

        await usdPlus.approve(staticUsdPlus.address, usdPlusAmountToWrap);

        // call again to change state
        await staticUsdPlus.wrap(account, usdPlusAmountToWrap);

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
            'ERC20: transfer amount exceeds allowance',
        );

        expect(await usdPlus.balanceOf(staticUsdPlus.address)).to.equals(0);
        expect(await usdPlus.balanceOf(account)).to.equals(0);
        expect(await staticUsdPlus.balanceOf(account)).to.equals(0);

        await usdc.approve(staticUsdPlus.address, usdcAmountToDeposit);

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

        await usdc.approve(staticUsdPlus.address, usdcAmountToDeposit);

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

        let usdcBalanceBefore = await usdc.balanceOf(account);

        // call again to change state
        let receipt = await (await staticUsdPlus.redeem(usdcAmountToDeposit, account, account)).wait();

        const depositEvent = receipt.events.find((e) => e.event === 'Withdraw' && e.args[0] === account);
        expect(depositEvent.args[3].toString()).to.equals(String(transferredDynamicAmount));

        expect(await usdPlus.balanceOf(staticUsdPlus.address)).to.equals(0);
        expect(await usdPlus.balanceOf(account)).to.equals(0);
        expect(await staticUsdPlus.balanceOf(account)).to.equals(0);

        expect((await usdc.balanceOf(account)).toString()).to.equals(
            new BN(usdcBalanceBefore.toString())
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

        await usdc.approve(staticUsdPlus.address, usdcAmountToDeposit);

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

        let usdcBalanceBefore = await usdc.balanceOf(account);

        // call again to change state
        let receipt = await (await staticUsdPlus.redeem(usdcAmountToDeposit, account, tmpUser.address)).wait();

        expect(await usdPlus.balanceOf(staticUsdPlus.address)).to.equals(0);
        expect(await usdPlus.balanceOf(account)).to.equals(0);
        expect(await staticUsdPlus.balanceOf(account)).to.equals(0);
        expect(await staticUsdPlus.balanceOf(tmpUser.address)).to.equals(0);
        expect(await staticUsdPlus.allowance(tmpUser.address, account)).to.equals(0);

        expect((await usdc.balanceOf(account)).toString()).to.equals(
            new BN(usdcBalanceBefore.toString())
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

        await usdc.approve(staticUsdPlus.address, usdcAmountToDeposit);

        let mintedStaticAmount = await staticUsdPlus.callStatic.deposit(usdcAmountToDeposit, account);
        await staticUsdPlus.deposit(usdcAmountToDeposit, account);

        expect(await staticUsdPlus.balanceOf(account)).to.equals(mintedStaticAmount);
        expect(await staticUsdPlus.totalAssets()).to.equals(usdcAmountToDeposit);

    });

    it("totalAssets / totalSupply eq to assetsPerShare", async function () {

        let liquidityIndex = new BN(10).pow(new BN(27)).muln(2); // 2*10^27
        await setLiquidityIndex(account, usdPlus, liquidityIndex);


        let usdcAmountToDeposit = 250;

        expect(await staticUsdPlus.balanceOf(account)).to.equals(0);
        expect(await staticUsdPlus.totalAssets()).to.equals(0);

        await usdc.approve(staticUsdPlus.address, usdcAmountToDeposit);

        let mintedStaticAmount = await staticUsdPlus.callStatic.deposit(usdcAmountToDeposit, account);
        await staticUsdPlus.deposit(usdcAmountToDeposit, account);

        expect(await staticUsdPlus.balanceOf(account)).to.equals(mintedStaticAmount);
        expect(await staticUsdPlus.totalAssets()).to.equals(usdcAmountToDeposit);
        expect(await staticUsdPlus.totalSupply()).to.equals(mintedStaticAmount);

        // assetsPerShare will be at `digits()` scale so upscale to 10^6
        let assetsDivSupply = new BN(10).pow(new BN(6)).muln(usdcAmountToDeposit);
        assetsDivSupply = assetsDivSupply.div(new BN(mintedStaticAmount.toString()));
        expect((await staticUsdPlus.assetsPerShare()).toString()).to.equals(assetsDivSupply.toString());

    });

    it("assetsOf", async function () {

        let liquidityIndex = new BN(10).pow(new BN(27)); // 10^27
        await setLiquidityIndex(account, usdPlus, liquidityIndex);

        let usdcAmountToDeposit = 250;

        expect(await staticUsdPlus.totalAssets()).to.equals(0);
        expect(await staticUsdPlus.assetsOf(account)).to.equals(0);

        await usdc.approve(staticUsdPlus.address, usdcAmountToDeposit);

        // call again to change state
        await staticUsdPlus.deposit(usdcAmountToDeposit, account);

        expect(await staticUsdPlus.totalAssets()).to.equals(usdcAmountToDeposit);
        expect(await staticUsdPlus.assetsOf(account)).to.equals(usdcAmountToDeposit);

    });

});




