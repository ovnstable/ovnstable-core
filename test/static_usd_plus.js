const {expect} = require("chai");
const chai = require("chai");
const {deployments, ethers, getNamedAccounts} = require("hardhat");
const {smock} = require("@defi-wonderland/smock");
const BN = require("bn.js");
const {constants} = require('@openzeppelin/test-helpers');
const {ZERO_ADDRESS} = constants;

const hre = require("hardhat");
const expectRevert = require("../utils/expectRevert");

chai.use(smock.matchers);

describe("StaticUsdPlusToken", function () {

    let account;
    let secondAccount;
    let usdPlus;
    let staticUsdPlus;


    beforeEach(async () => {
        // need to run inside IDEA via node script running
        await hre.run("compile");

        await deployments.fixture(["UsdPlusToken", "StaticUsdPlusToken"]);

        const {deployer, anotherAccount} = await getNamedAccounts();
        account = deployer;
        secondAccount = anotherAccount;
        usdPlus = await ethers.getContract("UsdPlusToken");
        usdPlus.setExchanger(account);
        staticUsdPlus = await ethers.getContract("StaticUsdPlusToken");
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
        await usdPlus.setLiquidityIndex(liquidityIndex.toString());
        let rate = await staticUsdPlus.rate();
        expect(rate.toString()).to.equals(liquidityIndex.toString());

        liquidityIndex = liquidityIndex.subn(1000)
        await usdPlus.setLiquidityIndex(liquidityIndex.toString());
        rate = await staticUsdPlus.rate();
        expect(rate.toString()).to.equals(liquidityIndex.toString());

    });

    it("assetsPerShare correspond to usdPlus liquidity index", async function () {

        let liquidityIndex = new BN(10).pow(new BN(27)); // 10^27
        await usdPlus.setLiquidityIndex(liquidityIndex.toString());
        let assetsPerShare = await staticUsdPlus.assetsPerShare();
        expect(assetsPerShare.toString()).to.equals(new BN(10).pow(new BN(6)).toString());

        liquidityIndex = new BN(10).pow(new BN(27)).muln(2);
        await usdPlus.setLiquidityIndex(liquidityIndex.toString());
        assetsPerShare = await staticUsdPlus.assetsPerShare();
        expect(assetsPerShare.toString()).to.equals(new BN(10).pow(new BN(6)).muln(2).toString());

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

    it("wrapping 1:1", async function () {

        let liquidityIndex = new BN(10).pow(new BN(27)); // 10^27
        await usdPlus.setLiquidityIndex(liquidityIndex.toString());


        await expectRevert(
            staticUsdPlus.callStatic.wrap(ZERO_ADDRESS, 1),
            'Zero address for receiver not allowed',
        );

        await expectRevert(
            staticUsdPlus.callStatic.wrap(account, 0),
            'Zero assets not allowed',
        );

        let usdPlusAmountToWrap = 250;
        let startUsdPlusBalance = 1000;
        await usdPlus.mint(account, startUsdPlusBalance);

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
        await usdPlus.setLiquidityIndex(liquidityIndex.toString());

        let usdPlusAmountToWrap = 250;
        let startUsdPlusBalance = 1000;
        await usdPlus.mint(account, startUsdPlusBalance);

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
        await usdPlus.setLiquidityIndex(liquidityIndex.toString());

        let usdPlusAmountToWrap = 250;
        let startUsdPlusBalance = 1000;
        await usdPlus.mint(account, startUsdPlusBalance);

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
        await usdPlus.setLiquidityIndex(liquidityIndex.toString());

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
        await usdPlus.setLiquidityIndex(liquidityIndex.toString());


        await expectRevert(
            staticUsdPlus.callStatic.unwrap(ZERO_ADDRESS, 1),
            'Zero address for receiver not allowed',
        );

        await expectRevert(
            staticUsdPlus.callStatic.unwrap(account, 0),
            'Zero shares not allowed',
        );

        let staticUsdPlusAmountToUnwrap = 250;
        await expectRevert(
            staticUsdPlus.callStatic.unwrap(account, staticUsdPlusAmountToUnwrap),
            'ERC20: burn amount exceeds balance',
        );

        let startUsdPlusBalance = 1000;
        await usdPlus.mint(account, startUsdPlusBalance);
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
        await usdPlus.setLiquidityIndex(liquidityIndex.toString());

        let staticUsdPlusAmountToUnwrap = 250;
        let startUsdPlusBalance = 1000;
        await usdPlus.mint(account, startUsdPlusBalance);
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
        await usdPlus.setLiquidityIndex(liquidityIndex.toString());

        let usdPlusAmountToWrap = 250;
        let startUsdPlusBalance = 1000;
        await usdPlus.mint(account, startUsdPlusBalance);

        await usdPlus.approve(staticUsdPlus.address, usdPlusAmountToWrap);

        // callStatic doesn't change state but return value
        let mintedStaticAmount = await staticUsdPlus.callStatic.wrap(account, usdPlusAmountToWrap);
        await staticUsdPlus.wrap(account, usdPlusAmountToWrap);

        // change LI 1:2
        liquidityIndex = new BN(10).pow(new BN(27)).muln(2); // 2*10^27
        await usdPlus.setLiquidityIndex(liquidityIndex.toString());

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
        await usdPlus.setLiquidityIndex(liquidityIndex.toString());

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
        await usdPlus.setLiquidityIndex(liquidityIndex.toString());

        let usdPlusAmountToWrap = 250;
        let startUsdPlusBalance = 1000;
        await usdPlus.mint(account, startUsdPlusBalance);

        await usdPlus.approve(staticUsdPlus.address, usdPlusAmountToWrap);

        // call again to change state
        await staticUsdPlus.wrap(account, usdPlusAmountToWrap);

        expect(await staticUsdPlus.balanceOf(account)).to.equals(usdPlusAmountToWrap / 2);
        expect(await staticUsdPlus.dynamicBalanceOf(account)).to.equals(usdPlusAmountToWrap);

    });

    it("redeem another owner", async function () {
        const [owner, tmpUser] = await ethers.getSigners();

        let liquidityIndex = new BN(10).pow(new BN(27)); // 10^27
        await usdPlus.setLiquidityIndex(liquidityIndex.toString());

        let staticUsdPlusAmountToRedeem = 250;
        await expectRevert(
            staticUsdPlus.callStatic.redeem(staticUsdPlusAmountToRedeem, account, tmpUser.address),
            'Redeem amount exceeds allowance',
        );

        let startUsdPlusBalance = 1000;
        await usdPlus.mint(account, startUsdPlusBalance);
        await usdPlus.approve(staticUsdPlus.address, staticUsdPlusAmountToRedeem);
        await staticUsdPlus.wrap(tmpUser.address, staticUsdPlusAmountToRedeem);

        expect(await usdPlus.balanceOf(staticUsdPlus.address)).to.equals(staticUsdPlusAmountToRedeem);
        expect(await usdPlus.balanceOf(account)).to.equals(startUsdPlusBalance - staticUsdPlusAmountToRedeem);
        expect(await staticUsdPlus.balanceOf(tmpUser.address)).to.equals(staticUsdPlusAmountToRedeem);


        await staticUsdPlus.connect(tmpUser).approve(account, staticUsdPlusAmountToRedeem);

        // callStatic doesn't change state but return value
        let transferredDynamicAmount = await staticUsdPlus.callStatic.redeem(staticUsdPlusAmountToRedeem, account, tmpUser.address);
        expect(transferredDynamicAmount.toString()).to.equals(String(staticUsdPlusAmountToRedeem));

        // call again to change state
        let receipt = await (await staticUsdPlus.redeem(staticUsdPlusAmountToRedeem, account, tmpUser.address)).wait();

        expect(await usdPlus.balanceOf(staticUsdPlus.address)).to.equals(0);
        expect(await usdPlus.balanceOf(account)).to.equals(startUsdPlusBalance);
        expect(await staticUsdPlus.balanceOf(account)).to.equals(0);
        expect(await staticUsdPlus.balanceOf(tmpUser.address)).to.equals(0);
        expect(await staticUsdPlus.allowance(tmpUser.address, account)).to.equals(0);

    });


});




