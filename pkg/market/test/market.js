const {expect} = require("chai");
const {deployments, ethers, getNamedAccounts} = require("hardhat");
const BN = require("bn.js");
const hre = require("hardhat");
let {POLYGON} = require('@overnight-contracts/common/utils/assets');
const {sharedBeforeEach} = require("@overnight-contracts/common/utils/sharedBeforeEach");


describe("Market", function () {

    let account;
    let userAccount;
    let usdPlus;
    let wrappedUsdPlus;
    let usdc;
    let market;
    let exchange;


    sharedBeforeEach('deploy and setup', async () => {
        // need to run inside IDEA via node script running
        await hre.run("compile");

        await deployments.fixture(['test', 'test_setting']);

        const signers = await ethers.getSigners();
        account = signers[0];
        userAccount = signers[1];

        usdPlus = await ethers.getContract("MockUsdPlusToken");
        wrappedUsdPlus = await ethers.getContract("WrappedUsdPlusToken");
        usdc = await ethers.getContractAt("IERC20", POLYGON.usdc);
        market = await ethers.getContract("Market");
        exchange = await ethers.getContract("MockExchange");

        await usdc.transfer(exchange.address, 1000000000000);
    });


    it("wrap usdc / unwrap usdc", async function () {
        // transfer usdc
        await usdc.transfer(userAccount.address, 10000);
        expect(await usdc.balanceOf(userAccount.address)).to.equals(10000);
        expect(await wrappedUsdPlus.balanceOf(userAccount.address)).to.equals(0);

        // wrap usdc
        await usdc.connect(userAccount).approve(market.address, 10000);
        let wrappedAmount = await market.connect(userAccount).callStatic.wrap(usdc.address, 10000, userAccount.address);
        let receiptWrap = await (await market.connect(userAccount).wrap(usdc.address, 10000, userAccount.address)).wait();
        expect(await wrappedUsdPlus.balanceOf(userAccount.address)).to.equals(wrappedAmount);
        expect(await wrappedUsdPlus.balanceOf(userAccount.address)).to.equals(await market.previewWrap(usdc.address, 10000));
        expect(await wrappedUsdPlus.balanceOf(userAccount.address)).to.equals(9996);
        expect(await usdc.balanceOf(userAccount.address)).to.equals(0);
        expect(receiptWrap.events.find((e) => e.event === 'Wrap').args[3].toString()).to.equals(wrappedAmount.toString());

        // unwrap usdc
        await wrappedUsdPlus.connect(userAccount).approve(market.address, 9996);
        let unwrappedAmount = await market.connect(userAccount).callStatic.unwrap(usdc.address, 9996, userAccount.address);
        let receiptUnwrap = await (await market.connect(userAccount).unwrap(usdc.address, 9996, userAccount.address)).wait();
        expect(await usdc.balanceOf(userAccount.address)).to.equals(unwrappedAmount);
        expect(await usdc.balanceOf(userAccount.address)).to.equals(await market.previewUnwrap(usdc.address, 9996));
        expect(await usdc.balanceOf(userAccount.address)).to.equals(9993);
        expect(await wrappedUsdPlus.balanceOf(userAccount.address)).to.equals(0);
        expect(receiptUnwrap.events.find((e) => e.event === 'Unwrap').args[3].toString()).to.equals(unwrappedAmount.toString());
    });

    it("wrap usdc / unwrap usd+", async function () {
        // transfer usdc
        await usdc.transfer(userAccount.address, 10000);
        expect(await usdc.balanceOf(userAccount.address)).to.equals(10000);
        expect(await wrappedUsdPlus.balanceOf(userAccount.address)).to.equals(0);

        // wrap usdc
        await usdc.connect(userAccount).approve(market.address, 10000);
        let wrappedAmount = await market.connect(userAccount).callStatic.wrap(usdc.address, 10000, userAccount.address);
        let receiptWrap = await (await market.connect(userAccount).wrap(usdc.address, 10000, userAccount.address)).wait();
        expect(await wrappedUsdPlus.balanceOf(userAccount.address)).to.equals(wrappedAmount);
        expect(await wrappedUsdPlus.balanceOf(userAccount.address)).to.equals(await market.previewWrap(usdc.address, 10000));
        expect(await wrappedUsdPlus.balanceOf(userAccount.address)).to.equals(9996);
        expect(await usdc.balanceOf(userAccount.address)).to.equals(0);
        expect(receiptWrap.events.find((e) => e.event === 'Wrap').args[3].toString()).to.equals(wrappedAmount.toString());
        
        // unwrap usd+
        expect(await usdPlus.balanceOf(userAccount.address)).to.equals(0);
        await wrappedUsdPlus.connect(userAccount).approve(market.address, 9996);
        let unwrappedAmount = await market.connect(userAccount).callStatic.unwrap(usdPlus.address, 9996, userAccount.address);
        let receiptUnwrap = await (await market.connect(userAccount).unwrap(usdPlus.address, 9996, userAccount.address)).wait();
        expect(await usdPlus.balanceOf(userAccount.address)).to.equals(unwrappedAmount);
        expect(await usdPlus.balanceOf(userAccount.address)).to.equals(await market.previewUnwrap(usdPlus.address, 9996));
        expect(await usdPlus.balanceOf(userAccount.address)).to.equals(9996);
        expect(await wrappedUsdPlus.balanceOf(userAccount.address)).to.equals(0);
        expect(receiptUnwrap.events.find((e) => e.event === 'Unwrap').args[3].toString()).to.equals(unwrappedAmount.toString());
    });
    
    it("wrap usd+ / unwrap usdc", async function () {
        // buy usd+
        await usdc.transfer(userAccount.address, 10000);
        await usdc.connect(userAccount).approve(exchange.address, 10000);
        await exchange.connect(userAccount).buy(usdc.address, 10000);
        expect(await usdPlus.balanceOf(userAccount.address)).to.equals(9996);
        expect(await wrappedUsdPlus.balanceOf(userAccount.address)).to.equals(0);

        // wrap usd+
        await usdPlus.connect(userAccount).approve(market.address, 9996);
        let wrappedAmount = await market.connect(userAccount).callStatic.wrap(usdPlus.address, 9996, userAccount.address);
        let receiptWrap = await (await market.connect(userAccount).wrap(usdPlus.address, 9996, userAccount.address)).wait();
        expect(await wrappedUsdPlus.balanceOf(userAccount.address)).to.equals(wrappedAmount);
        expect(await wrappedUsdPlus.balanceOf(userAccount.address)).to.equals(await market.previewWrap(usdPlus.address, 9996));
        expect(await wrappedUsdPlus.balanceOf(userAccount.address)).to.equals(9996);
        expect(await usdPlus.balanceOf(userAccount.address)).to.equals(0);
        expect(receiptWrap.events.find((e) => e.event === 'Wrap').args[3].toString()).to.equals(wrappedAmount.toString());

        // unwrap usdc
        expect(await usdc.balanceOf(userAccount.address)).to.equals(0);        
        await wrappedUsdPlus.connect(userAccount).approve(market.address, 9996);
        let unwrappedAmount = await market.connect(userAccount).callStatic.unwrap(usdc.address, 9996, userAccount.address);
        let receiptUnwrap = await (await market.connect(userAccount).unwrap(usdc.address, 9996, userAccount.address)).wait();
        expect(await usdc.balanceOf(userAccount.address)).to.equals(unwrappedAmount);
        expect(await usdc.balanceOf(userAccount.address)).to.equals(await market.previewUnwrap(usdc.address, 9996));
        expect(await usdc.balanceOf(userAccount.address)).to.equals(9993);
        expect(await wrappedUsdPlus.balanceOf(userAccount.address)).to.equals(0);
        expect(receiptUnwrap.events.find((e) => e.event === 'Unwrap').args[3].toString()).to.equals(unwrappedAmount.toString());
    });

    it("wrap usd+ / unwrap usd+", async function () {
        // buy usd+
        await usdc.transfer(userAccount.address, 10000);
        await usdc.connect(userAccount).approve(exchange.address, 10000);
        await exchange.connect(userAccount).buy(usdc.address, 10000);
        expect(await usdPlus.balanceOf(userAccount.address)).to.equals(9996);
        expect(await wrappedUsdPlus.balanceOf(userAccount.address)).to.equals(0);

        // wrap usd+
        await usdPlus.connect(userAccount).approve(market.address, 9996);
        let wrappedAmount = await market.connect(userAccount).callStatic.wrap(usdPlus.address, 9996, userAccount.address);
        let receiptWrap = await (await market.connect(userAccount).wrap(usdPlus.address, 9996, userAccount.address)).wait();
        expect(await wrappedUsdPlus.balanceOf(userAccount.address)).to.equals(wrappedAmount);
        expect(await wrappedUsdPlus.balanceOf(userAccount.address)).to.equals(await market.previewWrap(usdPlus.address, 9996));
        expect(await wrappedUsdPlus.balanceOf(userAccount.address)).to.equals(9996);
        expect(await usdPlus.balanceOf(userAccount.address)).to.equals(0);
        expect(receiptWrap.events.find((e) => e.event === 'Wrap').args[3].toString()).to.equals(wrappedAmount.toString());
        
        // unwrap usd+
        await wrappedUsdPlus.connect(userAccount).approve(market.address, 9996);
        let unwrappedAmount = await market.connect(userAccount).callStatic.unwrap(usdPlus.address, 9996, userAccount.address);
        let receiptUnwrap = await (await market.connect(userAccount).unwrap(usdPlus.address, 9996, userAccount.address)).wait();
        expect(await usdPlus.balanceOf(userAccount.address)).to.equals(unwrappedAmount);
        expect(await usdPlus.balanceOf(userAccount.address)).to.equals(await market.previewUnwrap(usdPlus.address, 9996));
        expect(await usdPlus.balanceOf(userAccount.address)).to.equals(9996);
        expect(await wrappedUsdPlus.balanceOf(userAccount.address)).to.equals(0);
        expect(receiptUnwrap.events.find((e) => e.event === 'Unwrap').args[3].toString()).to.equals(unwrappedAmount.toString());
    });
    
    it("wrap usdc / change liquidity index / unwrap usdc", async function () {
        // transfer usdc
        await usdc.transfer(userAccount.address, 10000);
        expect(await usdc.balanceOf(userAccount.address)).to.equals(10000);
        expect(await wrappedUsdPlus.balanceOf(userAccount.address)).to.equals(0);

        // wrap usdc
        await usdc.connect(userAccount).approve(market.address, 10000);
        let wrappedAmount = await market.connect(userAccount).callStatic.wrap(usdc.address, 10000, userAccount.address);
        let receiptWrap = await (await market.connect(userAccount).wrap(usdc.address, 10000, userAccount.address)).wait();
        expect(await wrappedUsdPlus.balanceOf(userAccount.address)).to.equals(wrappedAmount);
        expect(await wrappedUsdPlus.balanceOf(userAccount.address)).to.equals(await market.previewWrap(usdc.address, 10000));
        expect(await wrappedUsdPlus.balanceOf(userAccount.address)).to.equals(9996);
        expect(await usdc.balanceOf(userAccount.address)).to.equals(0);
        expect(receiptWrap.events.find((e) => e.event === 'Wrap').args[3].toString()).to.equals(wrappedAmount.toString());

        // change liquidity index
        let liquidityIndex = new BN(10).pow(new BN(27)).muln(2); // 2*10^27
        await exchange.setLiquidityIndex(liquidityIndex.toString());

        // unwrap usdc
        await wrappedUsdPlus.connect(userAccount).approve(market.address, 9996);
        let unwrappedAmount = await market.connect(userAccount).callStatic.unwrap(usdc.address, 9996, userAccount.address);
        let receiptUnwrap = await (await market.connect(userAccount).unwrap(usdc.address, 9996, userAccount.address)).wait();
        expect(await usdc.balanceOf(userAccount.address)).to.equals(unwrappedAmount);
        expect(await usdc.balanceOf(userAccount.address)).to.equals(await market.previewUnwrap(usdc.address, 9996));
        expect(await usdc.balanceOf(userAccount.address)).to.equals(19985);
        expect(await wrappedUsdPlus.balanceOf(userAccount.address)).to.equals(0);
        expect(receiptUnwrap.events.find((e) => e.event === 'Unwrap').args[3].toString()).to.equals(unwrappedAmount.toString());
    });

    it("wrap usdc / change liquidity index / unwrap usd+", async function () {
        // transfer usdc
        await usdc.transfer(userAccount.address, 10000);
        expect(await usdc.balanceOf(userAccount.address)).to.equals(10000);
        expect(await wrappedUsdPlus.balanceOf(userAccount.address)).to.equals(0);

        // wrap usdc
        await usdc.connect(userAccount).approve(market.address, 10000);
        let wrappedAmount = await market.connect(userAccount).callStatic.wrap(usdc.address, 10000, userAccount.address);
        let receiptWrap = await (await market.connect(userAccount).wrap(usdc.address, 10000, userAccount.address)).wait();
        expect(await wrappedUsdPlus.balanceOf(userAccount.address)).to.equals(wrappedAmount);
        expect(await wrappedUsdPlus.balanceOf(userAccount.address)).to.equals(await market.previewWrap(usdc.address, 10000));
        expect(await wrappedUsdPlus.balanceOf(userAccount.address)).to.equals(9996);
        expect(await usdc.balanceOf(userAccount.address)).to.equals(0);
        expect(receiptWrap.events.find((e) => e.event === 'Wrap').args[3].toString()).to.equals(wrappedAmount.toString());
        
        // change liquidity index
        let liquidityIndex = new BN(10).pow(new BN(27)).muln(2); // 2*10^27
        await exchange.setLiquidityIndex(liquidityIndex.toString());

        // unwrap usd+
        expect(await usdPlus.balanceOf(userAccount.address)).to.equals(0);
        await wrappedUsdPlus.connect(userAccount).approve(market.address, 9996);
        let unwrappedAmount = await market.connect(userAccount).callStatic.unwrap(usdPlus.address, 9996, userAccount.address);
        let receiptUnwrap = await (await market.connect(userAccount).unwrap(usdPlus.address, 9996, userAccount.address)).wait();
        expect(await usdPlus.balanceOf(userAccount.address)).to.equals(unwrappedAmount);
        expect(await usdPlus.balanceOf(userAccount.address)).to.equals(await market.previewUnwrap(usdPlus.address, 9996));
        expect(await usdPlus.balanceOf(userAccount.address)).to.equals(19992);
        expect(await wrappedUsdPlus.balanceOf(userAccount.address)).to.equals(0);
        expect(receiptUnwrap.events.find((e) => e.event === 'Unwrap').args[3].toString()).to.equals(unwrappedAmount.toString());
    });
    
    it("wrap usd+ / change liquidity index / unwrap usdc", async function () {
        // buy usd+
        await usdc.transfer(userAccount.address, 10000);
        await usdc.connect(userAccount).approve(exchange.address, 10000);
        await exchange.connect(userAccount).buy(usdc.address, 10000);
        expect(await usdPlus.balanceOf(userAccount.address)).to.equals(9996);
        expect(await wrappedUsdPlus.balanceOf(userAccount.address)).to.equals(0);

        // wrap usd+
        await usdPlus.connect(userAccount).approve(market.address, 9996);
        let wrappedAmount = await market.connect(userAccount).callStatic.wrap(usdPlus.address, 9996, userAccount.address);
        let receiptWrap = await (await market.connect(userAccount).wrap(usdPlus.address, 9996, userAccount.address)).wait();
        expect(await wrappedUsdPlus.balanceOf(userAccount.address)).to.equals(wrappedAmount);
        expect(await wrappedUsdPlus.balanceOf(userAccount.address)).to.equals(await market.previewWrap(usdPlus.address, 9996));
        expect(await wrappedUsdPlus.balanceOf(userAccount.address)).to.equals(9996);
        expect(await usdPlus.balanceOf(userAccount.address)).to.equals(0);
        expect(receiptWrap.events.find((e) => e.event === 'Wrap').args[3].toString()).to.equals(wrappedAmount.toString());

        // change liquidity index
        let liquidityIndex = new BN(10).pow(new BN(27)).muln(2); // 2*10^27
        await exchange.setLiquidityIndex(liquidityIndex.toString());

        // unwrap usdc
        expect(await usdc.balanceOf(userAccount.address)).to.equals(0);        
        await wrappedUsdPlus.connect(userAccount).approve(market.address, 9996);
        let unwrappedAmount = await market.connect(userAccount).callStatic.unwrap(usdc.address, 9996, userAccount.address);
        let receiptUnwrap = await (await market.connect(userAccount).unwrap(usdc.address, 9996, userAccount.address)).wait();
        expect(await usdc.balanceOf(userAccount.address)).to.equals(unwrappedAmount);
        expect(await usdc.balanceOf(userAccount.address)).to.equals(await market.previewUnwrap(usdc.address, 9996));
        expect(await usdc.balanceOf(userAccount.address)).to.equals(19985);
        expect(await wrappedUsdPlus.balanceOf(userAccount.address)).to.equals(0);
        expect(receiptUnwrap.events.find((e) => e.event === 'Unwrap').args[3].toString()).to.equals(unwrappedAmount.toString());
    });

    it("wrap usd+ / change liquidity index / unwrap usd+", async function () {
        // buy usd+
        await usdc.transfer(userAccount.address, 10000);
        await usdc.connect(userAccount).approve(exchange.address, 10000);
        await exchange.connect(userAccount).buy(usdc.address, 10000);
        expect(await usdPlus.balanceOf(userAccount.address)).to.equals(9996);
        expect(await wrappedUsdPlus.balanceOf(userAccount.address)).to.equals(0);

        // wrap usd+
        await usdPlus.connect(userAccount).approve(market.address, 9996);
        let wrappedAmount = await market.connect(userAccount).callStatic.wrap(usdPlus.address, 9996, userAccount.address);
        let receiptWrap = await (await market.connect(userAccount).wrap(usdPlus.address, 9996, userAccount.address)).wait();
        expect(await wrappedUsdPlus.balanceOf(userAccount.address)).to.equals(wrappedAmount);
        expect(await wrappedUsdPlus.balanceOf(userAccount.address)).to.equals(await market.previewWrap(usdPlus.address, 9996));
        expect(await wrappedUsdPlus.balanceOf(userAccount.address)).to.equals(9996);
        expect(await usdPlus.balanceOf(userAccount.address)).to.equals(0);
        expect(receiptWrap.events.find((e) => e.event === 'Wrap').args[3].toString()).to.equals(wrappedAmount.toString());
        
        // change liquidity index
        let liquidityIndex = new BN(10).pow(new BN(27)).muln(2); // 2*10^27
        await exchange.setLiquidityIndex(liquidityIndex.toString());

        // unwrap usd+
        await wrappedUsdPlus.connect(userAccount).approve(market.address, 9996);
        let unwrappedAmount = await market.connect(userAccount).callStatic.unwrap(usdPlus.address, 9996, userAccount.address);
        let receiptUnwrap = await (await market.connect(userAccount).unwrap(usdPlus.address, 9996, userAccount.address)).wait();
        expect(await usdPlus.balanceOf(userAccount.address)).to.equals(unwrappedAmount);
        expect(await usdPlus.balanceOf(userAccount.address)).to.equals(await market.previewUnwrap(usdPlus.address, 9996));
        expect(await usdPlus.balanceOf(userAccount.address)).to.equals(19992);
        expect(await wrappedUsdPlus.balanceOf(userAccount.address)).to.equals(0);
        expect(receiptUnwrap.events.find((e) => e.event === 'Unwrap').args[3].toString()).to.equals(unwrappedAmount.toString());
    });

    it("usd+ balance enough to unwrap if LiquidityIndex don't grow", async function () {
        // set LiquidityIndex
        await exchange.setLiquidityIndex('1030604144042764124558114376');

        // transfer usdc
        await usdc.transfer(userAccount.address, 20240461);
        expect(await usdc.balanceOf(userAccount.address)).to.equals(20240461);
        expect(await wrappedUsdPlus.balanceOf(userAccount.address)).to.equals(0);

        // wrap usdc
        await usdc.connect(userAccount).approve(market.address, 20240461);
        let wrappedAmount = await market.connect(userAccount).callStatic.wrap(usdc.address, 20240461, userAccount.address);
        let receiptWrap = await (await market.connect(userAccount).wrap(usdc.address, 20240461, userAccount.address)).wait();
        expect(await wrappedUsdPlus.balanceOf(userAccount.address)).to.equals(wrappedAmount);
        expect(await wrappedUsdPlus.balanceOf(userAccount.address)).to.equals(await market.previewWrap(usdc.address, 20240461));
        expect(await wrappedUsdPlus.balanceOf(userAccount.address)).to.equals(19631557);
        expect(await usdc.balanceOf(userAccount.address)).to.equals(0);
        expect(receiptWrap.events.find((e) => e.event === 'Wrap').args[3].toString()).to.equals(wrappedAmount.toString());

        // unwrap usdc
        await wrappedUsdPlus.connect(userAccount).approve(market.address, 19631557);
        let unwrappedAmount = await market.connect(userAccount).callStatic.unwrap(usdc.address, 19631557, userAccount.address);
        let receiptUnwrap = await (await market.connect(userAccount).unwrap(usdc.address, 19631557, userAccount.address)).wait();
        expect(await usdc.balanceOf(userAccount.address)).to.equals(unwrappedAmount);
        expect(await usdc.balanceOf(userAccount.address)).to.equals(await market.previewUnwrap(usdc.address, 19631557));
        expect(await usdc.balanceOf(userAccount.address)).to.equals(20224271);
        expect(await wrappedUsdPlus.balanceOf(userAccount.address)).to.equals(0);
        expect(receiptUnwrap.events.find((e) => e.event === 'Unwrap').args[3].toString()).to.equals(unwrappedAmount.toString());
    });

    it("usd+ balance enough to unwrap if LiquidityIndex don't grow", async function () {
        // set LiquidityIndex
        await exchange.setLiquidityIndex('1030604134042764124558114376');

        // transfer usdc
        await usdc.transfer(userAccount.address, 20240461);
        expect(await usdc.balanceOf(userAccount.address)).to.equals(20240461);
        expect(await wrappedUsdPlus.balanceOf(userAccount.address)).to.equals(0);

        // wrap usdc
        await usdc.connect(userAccount).approve(market.address, 20240461);
        let wrappedAmount = await market.connect(userAccount).callStatic.wrap(usdc.address, 20240461, userAccount.address);
        let receiptWrap = await (await market.connect(userAccount).wrap(usdc.address, 20240461, userAccount.address)).wait();
        expect(await wrappedUsdPlus.balanceOf(userAccount.address)).to.equals(wrappedAmount);
        expect(await wrappedUsdPlus.balanceOf(userAccount.address)).to.equals(await market.previewWrap(usdc.address, 20240461));
        expect(await wrappedUsdPlus.balanceOf(userAccount.address)).to.equals(19631558);
        expect(await usdc.balanceOf(userAccount.address)).to.equals(0);
        expect(receiptWrap.events.find((e) => e.event === 'Wrap').args[3].toString()).to.equals(wrappedAmount.toString());

        // unwrap usdc
        await wrappedUsdPlus.connect(userAccount).approve(market.address, 19631558);
        let unwrappedAmount = await market.connect(userAccount).callStatic.unwrap(usdc.address, 19631558, userAccount.address);
        let receiptUnwrap = await (await market.connect(userAccount).unwrap(usdc.address, 19631558, userAccount.address)).wait();
        expect(await usdc.balanceOf(userAccount.address)).to.equals(unwrappedAmount);
        expect(await usdc.balanceOf(userAccount.address)).to.equals(await market.previewUnwrap(usdc.address, 19631558));
        expect(await usdc.balanceOf(userAccount.address)).to.equals(20224272);
        expect(await wrappedUsdPlus.balanceOf(userAccount.address)).to.equals(0);
        expect(receiptUnwrap.events.find((e) => e.event === 'Unwrap').args[3].toString()).to.equals(unwrappedAmount.toString());
    });

    it("usd+ balance enough to unwrap if LiquidityIndex don't grow", async function () {
        // transfer usdc
        await usdc.transfer(userAccount.address, 20240461);
        expect(await usdc.balanceOf(userAccount.address)).to.equals(20240461);
        expect(await wrappedUsdPlus.balanceOf(userAccount.address)).to.equals(0);

        // wrap usdc
        await usdc.connect(userAccount).approve(market.address, 20240461);
        let wrappedAmount = await market.connect(userAccount).callStatic.wrap(usdc.address, 20240461, userAccount.address);
        let receiptWrap = await (await market.connect(userAccount).wrap(usdc.address, 20240461, userAccount.address)).wait();
        expect(await wrappedUsdPlus.balanceOf(userAccount.address)).to.equals(wrappedAmount);
        expect(await wrappedUsdPlus.balanceOf(userAccount.address)).to.equals(await market.previewWrap(usdc.address, 20240461));
        expect(await wrappedUsdPlus.balanceOf(userAccount.address)).to.equals(20232365);
        expect(await usdc.balanceOf(userAccount.address)).to.equals(0);
        expect(receiptWrap.events.find((e) => e.event === 'Wrap').args[3].toString()).to.equals(wrappedAmount.toString());

        // unwrap usdc
        await wrappedUsdPlus.connect(userAccount).approve(market.address, 20232365);
        let unwrappedAmount = await market.connect(userAccount).callStatic.unwrap(usdc.address, 20232365, userAccount.address);
        let receiptUnwrap = await (await market.connect(userAccount).unwrap(usdc.address, 20232365, userAccount.address)).wait();
        expect(await usdc.balanceOf(userAccount.address)).to.equals(unwrappedAmount);
        expect(await usdc.balanceOf(userAccount.address)).to.equals(await market.previewUnwrap(usdc.address, 20232365));
        expect(await usdc.balanceOf(userAccount.address)).to.equals(20224273);
        expect(await wrappedUsdPlus.balanceOf(userAccount.address)).to.equals(0);
        expect(receiptUnwrap.events.find((e) => e.event === 'Unwrap').args[3].toString()).to.equals(unwrappedAmount.toString());
    });

    it("usd+ balance enough to unwrap if LiquidityIndex small grow", async function () {
        // set LiquidityIndex
        await exchange.setLiquidityIndex('1030604144042764124558114376');

        // transfer usdc
        await usdc.transfer(userAccount.address, 20240461);
        expect(await usdc.balanceOf(userAccount.address)).to.equals(20240461);
        expect(await wrappedUsdPlus.balanceOf(userAccount.address)).to.equals(0);

        // wrap usdc
        await usdc.connect(userAccount).approve(market.address, 20240461);
        let wrappedAmount = await market.connect(userAccount).callStatic.wrap(usdc.address, 20240461, userAccount.address);
        let receiptWrap = await (await market.connect(userAccount).wrap(usdc.address, 20240461, userAccount.address)).wait();
        expect(await wrappedUsdPlus.balanceOf(userAccount.address)).to.equals(wrappedAmount);
        expect(await wrappedUsdPlus.balanceOf(userAccount.address)).to.equals(await market.previewWrap(usdc.address, 20240461));
        expect(await wrappedUsdPlus.balanceOf(userAccount.address)).to.equals(19631557);
        expect(await usdc.balanceOf(userAccount.address)).to.equals(0);
        expect(receiptWrap.events.find((e) => e.event === 'Wrap').args[3].toString()).to.equals(wrappedAmount.toString());

        // set new LiquidityIndex
        await exchange.setLiquidityIndex('1030604144052764124558114376');

        // unwrap usdc
        await wrappedUsdPlus.connect(userAccount).approve(market.address, 19631557);
        let unwrappedAmount = await market.connect(userAccount).callStatic.unwrap(usdc.address, 19631557, userAccount.address);
        let receiptUnwrap = await (await market.connect(userAccount).unwrap(usdc.address, 19631557, userAccount.address)).wait();
        expect(await usdc.balanceOf(userAccount.address)).to.equals(unwrappedAmount);
        expect(await usdc.balanceOf(userAccount.address)).to.equals(await market.previewUnwrap(usdc.address, 19631557));
        expect(await usdc.balanceOf(userAccount.address)).to.equals(20224271);
        expect(await wrappedUsdPlus.balanceOf(userAccount.address)).to.equals(0);
        expect(receiptUnwrap.events.find((e) => e.event === 'Unwrap').args[3].toString()).to.equals(unwrappedAmount.toString());
    });

    it("usd+ balance enough to unwrap if LiquidityIndex small grow", async function () {
        // set LiquidityIndex
        await exchange.setLiquidityIndex('1030604144042764124558114376');

        // transfer usdc
        await usdc.transfer(userAccount.address, 20240461);
        expect(await usdc.balanceOf(userAccount.address)).to.equals(20240461);
        expect(await wrappedUsdPlus.balanceOf(userAccount.address)).to.equals(0);

        // wrap usdc
        await usdc.connect(userAccount).approve(market.address, 20240461);
        let wrappedAmount = await market.connect(userAccount).callStatic.wrap(usdc.address, 20240461, userAccount.address);
        let receiptWrap = await (await market.connect(userAccount).wrap(usdc.address, 20240461, userAccount.address)).wait();
        expect(await wrappedUsdPlus.balanceOf(userAccount.address)).to.equals(wrappedAmount);
        expect(await wrappedUsdPlus.balanceOf(userAccount.address)).to.equals(await market.previewWrap(usdc.address, 20240461));
        expect(await wrappedUsdPlus.balanceOf(userAccount.address)).to.equals(19631557);
        expect(await usdc.balanceOf(userAccount.address)).to.equals(0);
        expect(receiptWrap.events.find((e) => e.event === 'Wrap').args[3].toString()).to.equals(wrappedAmount.toString());

        // set new LiquidityIndex
        await exchange.setLiquidityIndex('1030604168542764124558114376');

        // unwrap usdc
        await wrappedUsdPlus.connect(userAccount).approve(market.address, 19631557);
        let unwrappedAmount = await market.connect(userAccount).callStatic.unwrap(usdc.address, 19631557, userAccount.address);
        let receiptUnwrap = await (await market.connect(userAccount).unwrap(usdc.address, 19631557, userAccount.address)).wait();
        expect(await usdc.balanceOf(userAccount.address)).to.equals(unwrappedAmount);
        expect(await usdc.balanceOf(userAccount.address)).to.equals(await market.previewUnwrap(usdc.address, 19631557));
        expect(await usdc.balanceOf(userAccount.address)).to.equals(20224272);
        expect(await wrappedUsdPlus.balanceOf(userAccount.address)).to.equals(0);
        expect(receiptUnwrap.events.find((e) => e.event === 'Unwrap').args[3].toString()).to.equals(unwrappedAmount.toString());
    });

    it("usd+ balance enough to unwrap if LiquidityIndex small grow", async function () {
        // set LiquidityIndex
        await exchange.setLiquidityIndex('1030604134042764124558114376');

        // transfer usdc
        await usdc.transfer(userAccount.address, 20240461);
        expect(await usdc.balanceOf(userAccount.address)).to.equals(20240461);
        expect(await wrappedUsdPlus.balanceOf(userAccount.address)).to.equals(0);

        // wrap usdc
        await usdc.connect(userAccount).approve(market.address, 20240461);
        let wrappedAmount = await market.connect(userAccount).callStatic.wrap(usdc.address, 20240461, userAccount.address);
        let receiptWrap = await (await market.connect(userAccount).wrap(usdc.address, 20240461, userAccount.address)).wait();
        expect(await wrappedUsdPlus.balanceOf(userAccount.address)).to.equals(wrappedAmount);
        expect(await wrappedUsdPlus.balanceOf(userAccount.address)).to.equals(await market.previewWrap(usdc.address, 20240461));
        expect(await wrappedUsdPlus.balanceOf(userAccount.address)).to.equals(19631558);
        expect(await usdc.balanceOf(userAccount.address)).to.equals(0);
        expect(receiptWrap.events.find((e) => e.event === 'Wrap').args[3].toString()).to.equals(wrappedAmount.toString());

        // set new LiquidityIndex
        await exchange.setLiquidityIndex('1030604168542764124558114376');

        // unwrap usdc
        await wrappedUsdPlus.connect(userAccount).approve(market.address, 19631558);
        let unwrappedAmount = await market.connect(userAccount).callStatic.unwrap(usdc.address, 19631558, userAccount.address);
        let receiptUnwrap = await (await market.connect(userAccount).unwrap(usdc.address, 19631558, userAccount.address)).wait();
        expect(await usdc.balanceOf(userAccount.address)).to.equals(unwrappedAmount);
        expect(await usdc.balanceOf(userAccount.address)).to.equals(await market.previewUnwrap(usdc.address, 19631558));
        expect(await usdc.balanceOf(userAccount.address)).to.equals(20224273);
        expect(await wrappedUsdPlus.balanceOf(userAccount.address)).to.equals(0);
        expect(receiptUnwrap.events.find((e) => e.event === 'Unwrap').args[3].toString()).to.equals(unwrappedAmount.toString());
    });

});




