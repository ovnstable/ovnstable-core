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

        await deployments.fixture(['test', 'base', 'setting']);

        const signers = await ethers.getSigners();
        account = signers[0];
        userAccount = signers[1];

        usdPlus = await ethers.getContract("MockUsdPlusToken");
        wrappedUsdPlus = await ethers.getContract("WrappedUsdPlusToken");
        usdc = await ethers.getContractAt("ERC20", POLYGON.usdc);
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
        await market.connect(userAccount).wrap(usdc.address, 10000, userAccount.address);
        expect(await wrappedUsdPlus.balanceOf(userAccount.address)).to.equals(9996);
        expect(await usdc.balanceOf(userAccount.address)).to.equals(0);

        // unwrap usdc
        await wrappedUsdPlus.connect(userAccount).approve(market.address, 9996);
        await market.connect(userAccount).unwrap(usdc.address, 9996, userAccount.address);
        expect(await wrappedUsdPlus.balanceOf(userAccount.address)).to.equals(0);
        expect(await usdc.balanceOf(userAccount.address)).to.equals(9993);
    });

    it("wrap usdc / unwrap usd+", async function () {
        // transfer usdc
        await usdc.transfer(userAccount.address, 10000);
        expect(await usdc.balanceOf(userAccount.address)).to.equals(10000);
        expect(await wrappedUsdPlus.balanceOf(userAccount.address)).to.equals(0);

        // wrap usdc
        await usdc.connect(userAccount).approve(market.address, 10000);
        await market.connect(userAccount).wrap(usdc.address, 10000, userAccount.address);
        expect(await wrappedUsdPlus.balanceOf(userAccount.address)).to.equals(9996);
        expect(await usdc.balanceOf(userAccount.address)).to.equals(0);
        
        // unwrap usd+
        expect(await usdPlus.balanceOf(userAccount.address)).to.equals(0);
        await wrappedUsdPlus.connect(userAccount).approve(market.address, 9996);
        await market.connect(userAccount).unwrap(usdPlus.address, 9996, userAccount.address);
        expect(await wrappedUsdPlus.balanceOf(userAccount.address)).to.equals(0);
        expect(await usdPlus.balanceOf(userAccount.address)).to.equals(9996);
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
        await market.connect(userAccount).wrap(usdPlus.address, 9996, userAccount.address);
        expect(await wrappedUsdPlus.balanceOf(userAccount.address)).to.equals(9996);
        expect(await usdPlus.balanceOf(userAccount.address)).to.equals(0);

        // unwrap usdc
        expect(await usdc.balanceOf(userAccount.address)).to.equals(0);        
        await wrappedUsdPlus.connect(userAccount).approve(market.address, 9996);
        await market.connect(userAccount).unwrap(usdc.address, 9996, userAccount.address);
        expect(await wrappedUsdPlus.balanceOf(userAccount.address)).to.equals(0);
        expect(await usdc.balanceOf(userAccount.address)).to.equals(9993);
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
        await market.connect(userAccount).wrap(usdPlus.address, 9996, userAccount.address);
        expect(await wrappedUsdPlus.balanceOf(userAccount.address)).to.equals(9996);
        expect(await usdPlus.balanceOf(userAccount.address)).to.equals(0);
        
        // unwrap usd+
        await wrappedUsdPlus.connect(userAccount).approve(market.address, 9996);
        await market.connect(userAccount).unwrap(usdPlus.address, 9996, userAccount.address);
        expect(await wrappedUsdPlus.balanceOf(userAccount.address)).to.equals(0);
        expect(await usdPlus.balanceOf(userAccount.address)).to.equals(9996);
    });
    
    it("wrap usdc / change liquidity index / unwrap usdc", async function () {
        // transfer usdc
        await usdc.transfer(userAccount.address, 10000);
        expect(await usdc.balanceOf(userAccount.address)).to.equals(10000);
        expect(await wrappedUsdPlus.balanceOf(userAccount.address)).to.equals(0);

        // wrap usdc
        await usdc.connect(userAccount).approve(market.address, 10000);
        await market.connect(userAccount).wrap(usdc.address, 10000, userAccount.address);
        expect(await wrappedUsdPlus.balanceOf(userAccount.address)).to.equals(9996);
        expect(await usdc.balanceOf(userAccount.address)).to.equals(0);

        // change liquidity index
        let liquidityIndex = new BN(10).pow(new BN(27)).muln(2); // 2*10^27
        await usdPlus.setLiquidityIndex(liquidityIndex.toString());

        // unwrap usdc
        await wrappedUsdPlus.connect(userAccount).approve(market.address, 9996);
        await market.connect(userAccount).unwrap(usdc.address, 9996, userAccount.address);
        expect(await wrappedUsdPlus.balanceOf(userAccount.address)).to.equals(0);
        expect(await usdc.balanceOf(userAccount.address)).to.equals(19985);
    });

    it("wrap usdc / change liquidity index / unwrap usd+", async function () {
        // transfer usdc
        await usdc.transfer(userAccount.address, 10000);
        expect(await usdc.balanceOf(userAccount.address)).to.equals(10000);
        expect(await wrappedUsdPlus.balanceOf(userAccount.address)).to.equals(0);

        // wrap usdc
        await usdc.connect(userAccount).approve(market.address, 10000);
        await market.connect(userAccount).wrap(usdc.address, 10000, userAccount.address);
        expect(await wrappedUsdPlus.balanceOf(userAccount.address)).to.equals(9996);
        expect(await usdc.balanceOf(userAccount.address)).to.equals(0);
        
        // change liquidity index
        let liquidityIndex = new BN(10).pow(new BN(27)).muln(2); // 2*10^27
        await usdPlus.setLiquidityIndex(liquidityIndex.toString());

        // unwrap usd+
        expect(await usdPlus.balanceOf(userAccount.address)).to.equals(0);
        await wrappedUsdPlus.connect(userAccount).approve(market.address, 9996);
        await market.connect(userAccount).unwrap(usdPlus.address, 9996, userAccount.address);
        expect(await wrappedUsdPlus.balanceOf(userAccount.address)).to.equals(0);
        expect(await usdPlus.balanceOf(userAccount.address)).to.equals(19992);
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
        await market.connect(userAccount).wrap(usdPlus.address, 9996, userAccount.address);
        expect(await wrappedUsdPlus.balanceOf(userAccount.address)).to.equals(9996);
        expect(await usdPlus.balanceOf(userAccount.address)).to.equals(0);

        // change liquidity index
        let liquidityIndex = new BN(10).pow(new BN(27)).muln(2); // 2*10^27
        await usdPlus.setLiquidityIndex(liquidityIndex.toString());

        // unwrap usdc
        expect(await usdc.balanceOf(userAccount.address)).to.equals(0);        
        await wrappedUsdPlus.connect(userAccount).approve(market.address, 9996);
        await market.connect(userAccount).unwrap(usdc.address, 9996, userAccount.address);
        expect(await wrappedUsdPlus.balanceOf(userAccount.address)).to.equals(0);
        expect(await usdc.balanceOf(userAccount.address)).to.equals(19985);
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
        await market.connect(userAccount).wrap(usdPlus.address, 9996, userAccount.address);
        expect(await wrappedUsdPlus.balanceOf(userAccount.address)).to.equals(9996);
        expect(await usdPlus.balanceOf(userAccount.address)).to.equals(0);
        
        // change liquidity index
        let liquidityIndex = new BN(10).pow(new BN(27)).muln(2); // 2*10^27
        await usdPlus.setLiquidityIndex(liquidityIndex.toString());

        // unwrap usd+
        await wrappedUsdPlus.connect(userAccount).approve(market.address, 9996);
        await market.connect(userAccount).unwrap(usdPlus.address, 9996, userAccount.address);
        expect(await wrappedUsdPlus.balanceOf(userAccount.address)).to.equals(0);
        expect(await usdPlus.balanceOf(userAccount.address)).to.equals(19992);
    });

});




