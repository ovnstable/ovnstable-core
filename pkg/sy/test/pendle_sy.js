const {expect} = require("chai");
const {deployments, ethers, getNamedAccounts} = require("hardhat");
const BN = require("bn.js");
// const {constants} = require('@openzeppelin/test-helpers');
// const {ZERO_ADDRESS} = constants;
const hre = require("hardhat");
// const expectRevert = require("@overnight-contracts/common/utils/expectRevert");
let {ARBITRUM} = require('@overnight-contracts/common/utils/assets');
const {sharedBeforeEach} = require("@overnight-contracts/common/utils/sharedBeforeEach");


describe("PendleUsdPlusTokenSY", function () {

    let account;
    let usdPlus;
    let usdPlusSY;
    let usdc;
    let exchange;
    let koef;
    let usdcAmountToDeposit;
    let usdcAmountToDeposit2;


    async function depositUsdPlus(usdcAmountToDeposit) {

        await usdc.approve(exchange.address, usdcAmountToDeposit);
        await exchange.buy(usdc.address, usdcAmountToDeposit);
        await usdPlus.approve(usdPlusSY.address, usdcAmountToDeposit);
        let mintedWrappedAmount = await usdPlusSY.callStatic.deposit(account, usdPlus.address, usdcAmountToDeposit, 0);
        expect(await usdPlusSY.previewDeposit(usdPlus.address, usdcAmountToDeposit)).to.equals(mintedWrappedAmount);
        await usdPlusSY.deposit(account, usdPlus.address, usdcAmountToDeposit, 0);
    
    }

    async function depositUsdc(usdcAmountToDeposit) {

        await usdc.approve(usdPlusSY.address, usdcAmountToDeposit);
        let mintedWrappedAmount = await usdPlusSY.callStatic.deposit(account, usdc.address, usdcAmountToDeposit, 0);
        expect(await usdPlusSY.previewDeposit(usdc.address, usdcAmountToDeposit)).to.equals(mintedWrappedAmount);
        await usdPlusSY.deposit(account, usdc.address, usdcAmountToDeposit, 0);
    
    }

    async function redeemUsdPlus(amountSharesToRedeem) {

        let redeemedUsdPlusAmount = await usdPlusSY.callStatic.redeem(account, amountSharesToRedeem, usdPlus.address, 0, false);
        expect(await usdPlusSY.previewRedeem(usdPlus.address, amountSharesToRedeem)).to.equals(redeemedUsdPlusAmount);
        await usdPlusSY.redeem(account, amountSharesToRedeem, usdPlus.address, 0, false);
    
    }

    async function redeemUsdc(amountSharesToRedeem) {

        let redeemedUsdPlusAmount = await usdPlusSY.callStatic.redeem(account, amountSharesToRedeem, usdc.address, 0, false);
        expect(await usdPlusSY.previewRedeem(usdc.address, amountSharesToRedeem)).to.equals(redeemedUsdPlusAmount);
        await usdPlusSY.redeem(account, amountSharesToRedeem, usdc.address, 0, false);
    
    }

    async function setLiquidityIndex(liquidityIndex) {

        await exchange.setLiquidityIndex(liquidityIndex.toString());
        expect((await usdPlusSY.exchangeRate()).toString()).to.equals(liquidityIndex.toString());
    
    }


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

        await usdPlus.setExchanger(exchange.address);
    });


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
        expect(await usdPlusSY.balanceOf(account)).to.equals(usdcAmountToDeposit + usdcAmountToDeposit2);

        await setLiquidityIndex(new BN(10).pow(new BN(27)).divn(koef));
        expect(await usdPlusSY.balanceOf(account)).to.equals(usdcAmountToDeposit + usdcAmountToDeposit2);
        
    });

    it("2. deposit usd+ --> liq down --> deposit usd+ --> liq up", async function () {
        
        await setLiquidityIndex(new BN(10).pow(new BN(27)));

        await depositUsdPlus(usdcAmountToDeposit);
        expect(await usdPlusSY.balanceOf(account)).to.equals(usdcAmountToDeposit);

        await setLiquidityIndex(new BN(10).pow(new BN(27)).divn(koef));
        expect(await usdPlusSY.balanceOf(account)).to.equals(usdcAmountToDeposit);
                
        await depositUsdPlus(usdcAmountToDeposit2);
        expect(await usdPlusSY.balanceOf(account)).to.equals(usdcAmountToDeposit + usdcAmountToDeposit2);

        await setLiquidityIndex(new BN(10).pow(new BN(27)).muln(koef));
        expect(await usdPlusSY.balanceOf(account)).to.equals(usdcAmountToDeposit + usdcAmountToDeposit2);
        
    });

    it("3. deposit usdc --> liq up --> deposit usdc --> liq down", async function () {
        
        await setLiquidityIndex(new BN(10).pow(new BN(27)));

        await depositUsdc(usdcAmountToDeposit);
        expect(await usdPlusSY.balanceOf(account)).to.equals(usdcAmountToDeposit);

        await setLiquidityIndex(new BN(10).pow(new BN(27)).muln(koef));
        expect(await usdPlusSY.balanceOf(account)).to.equals(usdcAmountToDeposit);
                
        await depositUsdc(usdcAmountToDeposit2);
        expect(await usdPlusSY.balanceOf(account)).to.equals(usdcAmountToDeposit + usdcAmountToDeposit2 / koef);

        await setLiquidityIndex(new BN(10).pow(new BN(27)).divn(koef));
        expect(await usdPlusSY.balanceOf(account)).to.equals(usdcAmountToDeposit + usdcAmountToDeposit2 / koef);
        
    });

    it("4. deposit usdc --> liq down --> deposit usdc --> liq up", async function () {
        
        await setLiquidityIndex(new BN(10).pow(new BN(27)));

        await depositUsdc(usdcAmountToDeposit);
        expect(await usdPlusSY.balanceOf(account)).to.equals(usdcAmountToDeposit);

        await setLiquidityIndex(new BN(10).pow(new BN(27)).divn(koef));
        expect(await usdPlusSY.balanceOf(account)).to.equals(usdcAmountToDeposit);
                
        await depositUsdc(usdcAmountToDeposit2);
        expect(await usdPlusSY.balanceOf(account)).to.equals(usdcAmountToDeposit + usdcAmountToDeposit2 * koef);

        await setLiquidityIndex(new BN(10).pow(new BN(27)).muln(koef));
        expect(await usdPlusSY.balanceOf(account)).to.equals(usdcAmountToDeposit + usdcAmountToDeposit2 * koef);
        
    });

    it("5. deposit usdc --> liq up --> deposit usd+ --> liq down", async function () {
        
        await setLiquidityIndex(new BN(10).pow(new BN(27)));

        await depositUsdc(usdcAmountToDeposit);
        expect(await usdPlusSY.balanceOf(account)).to.equals(usdcAmountToDeposit);

        await setLiquidityIndex(new BN(10).pow(new BN(27)).muln(koef));
        expect(await usdPlusSY.balanceOf(account)).to.equals(usdcAmountToDeposit);
                
        await depositUsdPlus(usdcAmountToDeposit2);
        expect(await usdPlusSY.balanceOf(account)).to.equals(usdcAmountToDeposit + usdcAmountToDeposit2);

        await setLiquidityIndex(new BN(10).pow(new BN(27)).divn(koef));
        expect(await usdPlusSY.balanceOf(account)).to.equals(usdcAmountToDeposit + usdcAmountToDeposit2);
        
    });

    it("6. deposit usd+ --> liq up --> deposit usdc --> liq down", async function () {
        
        await setLiquidityIndex(new BN(10).pow(new BN(27)));

        await depositUsdPlus(usdcAmountToDeposit);
        expect(await usdPlusSY.balanceOf(account)).to.equals(usdcAmountToDeposit);

        await setLiquidityIndex(new BN(10).pow(new BN(27)).muln(koef));
        expect(await usdPlusSY.balanceOf(account)).to.equals(usdcAmountToDeposit);
                
        await depositUsdc(usdcAmountToDeposit2);
        expect(await usdPlusSY.balanceOf(account)).to.equals(usdcAmountToDeposit + usdcAmountToDeposit2 / koef);

        await setLiquidityIndex(new BN(10).pow(new BN(27)).divn(koef));
        expect(await usdPlusSY.balanceOf(account)).to.equals(usdcAmountToDeposit + usdcAmountToDeposit2 / koef);
        
    });

    it("7. deposit usdc --> liq down --> deposit usd+ --> liq up", async function () {
        
        await setLiquidityIndex(new BN(10).pow(new BN(27)));

        await depositUsdc(usdcAmountToDeposit);
        expect(await usdPlusSY.balanceOf(account)).to.equals(usdcAmountToDeposit);

        await setLiquidityIndex(new BN(10).pow(new BN(27)).divn(koef));
        expect(await usdPlusSY.balanceOf(account)).to.equals(usdcAmountToDeposit);
                
        await depositUsdPlus(usdcAmountToDeposit2);
        expect(await usdPlusSY.balanceOf(account)).to.equals(usdcAmountToDeposit + usdcAmountToDeposit2);

        await setLiquidityIndex(new BN(10).pow(new BN(27)).muln(koef));
        expect(await usdPlusSY.balanceOf(account)).to.equals(usdcAmountToDeposit + usdcAmountToDeposit2);
        
    });

    it("8. deposit usd+ --> liq down --> deposit usdc --> liq up", async function () {
        
        await setLiquidityIndex(new BN(10).pow(new BN(27)));

        await depositUsdPlus(usdcAmountToDeposit);
        expect(await usdPlusSY.balanceOf(account)).to.equals(usdcAmountToDeposit);

        await setLiquidityIndex(new BN(10).pow(new BN(27)).divn(koef));
        expect(await usdPlusSY.balanceOf(account)).to.equals(usdcAmountToDeposit);
                
        await depositUsdc(usdcAmountToDeposit2);
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

    it("10. deposit usdc --> redeem usdc", async function () {
        
        await setLiquidityIndex(new BN(10).pow(new BN(27)));

        await depositUsdc(usdcAmountToDeposit);
        expect(await usdPlusSY.balanceOf(account)).to.equals(usdcAmountToDeposit);
                
        let usdcBefore = await usdc.balanceOf(account);
        await redeemUsdc(usdcAmountToDeposit / koef);
        expect((await usdc.balanceOf(account)) - usdcBefore).to.equals(usdcAmountToDeposit / koef);
        expect(await usdPlusSY.balanceOf(account)).to.equals(usdcAmountToDeposit / koef * (koef - 1));
        
    });


    // it("deposit 1:1", async function () {
    //     let liquidityIndex = new BN(10).pow(new BN(27)); // 10^27
    //     await exchange.setLiquidityIndex(liquidityIndex.toString());

    //     let usdcAmountToDeposit = 250;

    //     await expectRevert(
    //         wrappedUsdPlus.callStatic.deposit(1, ZERO_ADDRESS),
    //         'Zero address for receiver not allowed',
    //     );

    //     await expectRevert(
    //         wrappedUsdPlus.callStatic.deposit(0, account),
    //         'Zero assets not allowed',
    //     );

    //     await expectRevert(
    //         wrappedUsdPlus.callStatic.deposit(usdcAmountToDeposit, account),
    //         'ERC20: transfer amount exceeds balance',
    //     );

    //     expect(await usdPlus.balanceOf(wrappedUsdPlus.address)).to.equals(0);
    //     expect(await usdPlus.balanceOf(account)).to.equals(0);
    //     expect(await wrappedUsdPlus.balanceOf(account)).to.equals(0);

    //     await usdc.approve(exchange.address, usdcAmountToDeposit);
    //     await exchange.buy(usdc.address, usdcAmountToDeposit);
    //     await usdPlus.approve(wrappedUsdPlus.address, usdcAmountToDeposit);

    //     // callStatic doesn't change state but return value
    //     let mintedWrappedAmount = await wrappedUsdPlus.callStatic.deposit(usdcAmountToDeposit, account);
    //     expect(mintedWrappedAmount.toString()).to.equals(await wrappedUsdPlus.previewDeposit(usdcAmountToDeposit));

    //     // call again to change state
    //     let receipt = await (await wrappedUsdPlus.deposit(usdcAmountToDeposit, account)).wait();

    //     liquidityIndex = new BN(10).pow(new BN(27)).muln(2); // 2*10^27
    //     await exchange.setLiquidityIndex(liquidityIndex.toString());

    //     const depositEvent = receipt.events.find((e) => e.event === 'Deposit' && e.args[0] === account);
    //     expect(depositEvent.args[3].toString()).to.equals(String(mintedWrappedAmount));

    //     expect(await usdPlus.balanceOf(wrappedUsdPlus.address)).to.equals(usdcAmountToDeposit * 2);
    //     expect(await usdPlus.balanceOf(account)).to.equals(0);
    //     expect(await wrappedUsdPlus.balanceOf(account)).to.equals(mintedWrappedAmount);
    // });

    // it("deposit and redeem 1:1", async function () {
    //     let liquidityIndex = new BN(10).pow(new BN(27)); // 10^27
    //     await exchange.setLiquidityIndex(liquidityIndex.toString());

    //     let usdcAmountToDeposit = 250;

    //     await expectRevert(
    //         wrappedUsdPlus.callStatic.redeem(1, ZERO_ADDRESS, account),
    //         'Zero address for receiver not allowed',
    //     );

    //     await expectRevert(
    //         wrappedUsdPlus.callStatic.redeem(1, account, ZERO_ADDRESS),
    //         'Zero address for owner not allowed',
    //     );

    //     await expectRevert(
    //         wrappedUsdPlus.callStatic.redeem(0, account, account),
    //         'Zero shares not allowed',
    //     );

    //     expect(await usdPlus.balanceOf(wrappedUsdPlus.address)).to.equals(0);
    //     expect(await usdPlus.balanceOf(account)).to.equals(0);
    //     expect(await wrappedUsdPlus.balanceOf(account)).to.equals(0);

    //     await usdc.approve(exchange.address, usdcAmountToDeposit);
    //     await exchange.buy(usdc.address, usdcAmountToDeposit);
    //     await usdPlus.approve(wrappedUsdPlus.address, usdcAmountToDeposit);

    //     // callStatic doesn't change state but return value
    //     let mintedWrappedAmount = await wrappedUsdPlus.callStatic.deposit(usdcAmountToDeposit, account);
    //     expect(mintedWrappedAmount.toString()).to.equals(await wrappedUsdPlus.previewDeposit(usdcAmountToDeposit));

    //     // call again to change state
    //     await (await wrappedUsdPlus.deposit(usdcAmountToDeposit, account)).wait();

    //     liquidityIndex = new BN(10).pow(new BN(27)).muln(2); // 2*10^27
    //     await exchange.setLiquidityIndex(liquidityIndex.toString());

    //     expect(await usdPlus.balanceOf(wrappedUsdPlus.address)).to.equals(usdcAmountToDeposit * 2);
    //     expect(await usdPlus.balanceOf(account)).to.equals(0);
    //     expect(await wrappedUsdPlus.balanceOf(account)).to.equals(mintedWrappedAmount);

    //     // callStatic doesn't change state but return value
    //     let transferredUnwrappedAmount = await wrappedUsdPlus.callStatic.redeem(mintedWrappedAmount, account, account);
    //     expect(transferredUnwrappedAmount.toString()).to.equals(await wrappedUsdPlus.previewRedeem(mintedWrappedAmount));

    //     let usdPlusBalanceBefore = await usdPlus.balanceOf(account);

    //     // call again to change state
    //     let receipt = await (await wrappedUsdPlus.redeem(mintedWrappedAmount, account, account)).wait();

    //     const withdrawEvent = receipt.events.find((e) => e.event === 'Withdraw' && e.args[0] === account);
    //     expect(withdrawEvent.args[3].toString()).to.equals(String(transferredUnwrappedAmount));

    //     expect(await usdPlus.balanceOf(wrappedUsdPlus.address)).to.equals(0);
    //     expect(await wrappedUsdPlus.balanceOf(account)).to.equals(0);

    //     expect((await usdPlus.balanceOf(account)).toString()).to.equals(
    //         new BN(usdPlusBalanceBefore.toString())
    //             .add(new BN(transferredUnwrappedAmount.toString()))
    //             .toString()
    //     );
    // });

    // it("redeem another owner", async function () {
    //     const [owner, tmpUser] = await ethers.getSigners();

    //     let liquidityIndex = new BN(10).pow(new BN(27)); // 10^27
    //     await exchange.setLiquidityIndex(liquidityIndex.toString());

    //     let usdcAmountToDeposit = 250;
    //     await expectRevert(
    //         wrappedUsdPlus.callStatic.redeem(usdcAmountToDeposit, account, tmpUser.address),
    //         'Redeem amount exceeds allowance',
    //     );

    //     await usdc.approve(exchange.address, usdcAmountToDeposit);
    //     await exchange.buy(usdc.address, usdcAmountToDeposit);
    //     await usdPlus.approve(wrappedUsdPlus.address, usdcAmountToDeposit);

    //     // callStatic doesn't change state but return value
    //     let mintedWrappedAmount = await wrappedUsdPlus.callStatic.deposit(usdcAmountToDeposit, tmpUser.address);
    //     expect(mintedWrappedAmount.toString()).to.equals(await wrappedUsdPlus.previewDeposit(usdcAmountToDeposit));

    //     // call again to change state
    //     await (await wrappedUsdPlus.deposit(usdcAmountToDeposit, tmpUser.address)).wait();

    //     liquidityIndex = new BN(10).pow(new BN(27)).muln(2); // 2*10^27
    //     await exchange.setLiquidityIndex(liquidityIndex.toString());

    //     expect(await usdPlus.balanceOf(wrappedUsdPlus.address)).to.equals(usdcAmountToDeposit * 2);
    //     expect(await usdPlus.balanceOf(account)).to.equals(0);
    //     expect(await wrappedUsdPlus.balanceOf(tmpUser.address)).to.equals(mintedWrappedAmount);

    //     await wrappedUsdPlus.connect(tmpUser).approve(account, mintedWrappedAmount);
    //     expect(await wrappedUsdPlus.allowance(tmpUser.address, account)).to.equals(mintedWrappedAmount);

    //     // callStatic doesn't change state but return value
    //     let transferredUnwrappedAmount = await wrappedUsdPlus.callStatic.redeem(mintedWrappedAmount, account, tmpUser.address);
    //     expect(transferredUnwrappedAmount.toString()).to.equals(await wrappedUsdPlus.previewRedeem(mintedWrappedAmount));

    //     let usdPlusBalanceBefore = await usdPlus.balanceOf(account);

    //     // call again to change state
    //     let receipt = await (await wrappedUsdPlus.redeem(mintedWrappedAmount, account, tmpUser.address)).wait();

    //     expect(await usdPlus.balanceOf(wrappedUsdPlus.address)).to.equals(0);
    //     expect(await wrappedUsdPlus.balanceOf(account)).to.equals(0);
    //     expect(await wrappedUsdPlus.balanceOf(tmpUser.address)).to.equals(0);
    //     expect(await wrappedUsdPlus.allowance(tmpUser.address, account)).to.equals(0);

    //     expect((await usdPlus.balanceOf(account)).toString()).to.equals(
    //         new BN(usdPlusBalanceBefore.toString())
    //             .add(new BN(transferredUnwrappedAmount.toString()))
    //             .toString()
    //     );
    // });

    // it("deposit and redeem 2:1", async function () {
    //     let liquidityIndex = new BN(10).pow(new BN(27)); // 10^27
    //     await exchange.setLiquidityIndex(liquidityIndex.toString());

    //     let usdcAmountToDeposit = 250;

    //     expect(await usdPlus.balanceOf(wrappedUsdPlus.address)).to.equals(0);
    //     expect(await usdPlus.balanceOf(account)).to.equals(0);
    //     expect(await wrappedUsdPlus.balanceOf(account)).to.equals(0);

    //     await usdc.approve(exchange.address, usdcAmountToDeposit);
    //     await exchange.buy(usdc.address, usdcAmountToDeposit);
    //     await usdPlus.approve(wrappedUsdPlus.address, usdcAmountToDeposit);

    //     // callStatic doesn't change state but return value
    //     let mintedWrappedAmount = await wrappedUsdPlus.callStatic.deposit(usdcAmountToDeposit, account);
    //     expect(mintedWrappedAmount.toString()).to.equals(await wrappedUsdPlus.previewDeposit(usdcAmountToDeposit));

    //     // call again to change state
    //     await (await wrappedUsdPlus.deposit(usdcAmountToDeposit, account)).wait();

    //     liquidityIndex = new BN(10).pow(new BN(27)).muln(2); // 2*10^27
    //     await exchange.setLiquidityIndex(liquidityIndex.toString());

    //     expect(await usdPlus.balanceOf(wrappedUsdPlus.address)).to.equals(usdcAmountToDeposit * 2);
    //     expect(await usdPlus.balanceOf(account)).to.equals(0);
    //     expect(await wrappedUsdPlus.balanceOf(account)).to.equals(mintedWrappedAmount);

    //     // callStatic doesn't change state but return value
    //     let transferredUnwrappedAmount = await wrappedUsdPlus.callStatic.redeem(mintedWrappedAmount / 2, account, account);
    //     expect(transferredUnwrappedAmount.toString()).to.equals(await wrappedUsdPlus.previewRedeem(mintedWrappedAmount / 2));

    //     let usdPlusBalanceBefore = await usdPlus.balanceOf(account);

    //     // call again to change state
    //     let receipt = await (await wrappedUsdPlus.redeem(mintedWrappedAmount / 2, account, account)).wait();

    //     expect(await usdPlus.balanceOf(wrappedUsdPlus.address)).to.equals(250);
    //     expect(await wrappedUsdPlus.balanceOf(account)).to.equals(125);

    //     expect((await usdPlus.balanceOf(account)).toString()).to.equals(
    //         new BN(usdPlusBalanceBefore.toString())
    //             .add(new BN(transferredUnwrappedAmount.toString()))
    //             .toString()
    //     );
    // });

    // it("mint 1:1", async function () {
    //     let liquidityIndex = new BN(10).pow(new BN(27)); // 10^27
    //     await exchange.setLiquidityIndex(liquidityIndex.toString());

    //     let usdcAmountToMint = 250;
    //     let sharesToMint = await wrappedUsdPlus.convertToShares(usdcAmountToMint);

    //     await expectRevert(
    //         wrappedUsdPlus.callStatic.mint(1, ZERO_ADDRESS),
    //         'Zero address for receiver not allowed',
    //     );

    //     await expectRevert(
    //         wrappedUsdPlus.callStatic.mint(0, account),
    //         'Zero shares not allowed',
    //     );

    //     await expectRevert(
    //         wrappedUsdPlus.callStatic.mint(sharesToMint, account),
    //         'ERC20: transfer amount exceeds balance',
    //     );

    //     expect(await usdPlus.balanceOf(wrappedUsdPlus.address)).to.equals(0);
    //     expect(await usdPlus.balanceOf(account)).to.equals(0);
    //     expect(await wrappedUsdPlus.balanceOf(account)).to.equals(0);

    //     await usdc.approve(exchange.address, usdcAmountToMint);
    //     await exchange.buy(usdc.address, usdcAmountToMint);
    //     await usdPlus.approve(wrappedUsdPlus.address, usdcAmountToMint);

    //     // callStatic doesn't change state but return value
    //     let mintedWrappedAmount = await wrappedUsdPlus.callStatic.mint(sharesToMint, account);
    //     expect(mintedWrappedAmount.toString()).to.equals(await wrappedUsdPlus.previewMint(sharesToMint));

    //     // call again to change state
    //     let receipt = await (await wrappedUsdPlus.mint(sharesToMint, account)).wait();

    //     liquidityIndex = new BN(10).pow(new BN(27)).muln(2); // 2*10^27
    //     await exchange.setLiquidityIndex(liquidityIndex.toString());

    //     const depositEvent = receipt.events.find((e) => e.event === 'Deposit' && e.args[0] === account);
    //     expect(depositEvent.args[3].toString()).to.equals(sharesToMint);

    //     expect(await usdPlus.balanceOf(wrappedUsdPlus.address)).to.equals(mintedWrappedAmount * 2);
    //     expect(await usdPlus.balanceOf(account)).to.equals(0);
    //     expect(await wrappedUsdPlus.balanceOf(account)).to.equals(sharesToMint);
    // });

    // it("mint and withdraw 1:1", async function () {
    //     let liquidityIndex = new BN(10).pow(new BN(27)); // 10^27
    //     await exchange.setLiquidityIndex(liquidityIndex.toString());

    //     let usdcAmountToMint = 250;
    //     let sharesToMint = await wrappedUsdPlus.convertToShares(usdcAmountToMint);

    //     await expectRevert(
    //         wrappedUsdPlus.callStatic.withdraw(1, ZERO_ADDRESS, account),
    //         'Zero address for receiver not allowed',
    //     );

    //     await expectRevert(
    //         wrappedUsdPlus.callStatic.withdraw(1, account, ZERO_ADDRESS),
    //         'Zero address for owner not allowed',
    //     );

    //     await expectRevert(
    //         wrappedUsdPlus.callStatic.withdraw(0, account, account),
    //         'Zero assets not allowed',
    //     );

    //     expect(await usdPlus.balanceOf(wrappedUsdPlus.address)).to.equals(0);
    //     expect(await usdPlus.balanceOf(account)).to.equals(0);
    //     expect(await wrappedUsdPlus.balanceOf(account)).to.equals(0);

    //     await usdc.approve(exchange.address, usdcAmountToMint);
    //     await exchange.buy(usdc.address, usdcAmountToMint);
    //     await usdPlus.approve(wrappedUsdPlus.address, usdcAmountToMint);

    //     // callStatic doesn't change state but return value
    //     let mintedWrappedAmount = await wrappedUsdPlus.callStatic.mint(sharesToMint, account);
    //     expect(mintedWrappedAmount.toString()).to.equals(await wrappedUsdPlus.previewMint(sharesToMint));

    //     // call again to change state
    //     await (await wrappedUsdPlus.mint(sharesToMint, account)).wait();

    //     liquidityIndex = new BN(10).pow(new BN(27)).muln(2); // 2*10^27
    //     await exchange.setLiquidityIndex(liquidityIndex.toString());

    //     expect(await usdPlus.balanceOf(wrappedUsdPlus.address)).to.equals(mintedWrappedAmount * 2);
    //     expect(await usdPlus.balanceOf(account)).to.equals(0);
    //     expect(await wrappedUsdPlus.balanceOf(account)).to.equals(sharesToMint);

    //     // callStatic doesn't change state but return value
    //     let transferredUnwrappedAmount = await wrappedUsdPlus.callStatic.withdraw(mintedWrappedAmount * 2, account, account);
    //     expect(transferredUnwrappedAmount.toString()).to.equals(await wrappedUsdPlus.previewWithdraw(mintedWrappedAmount * 2));

    //     let usdPlusBalanceBefore = await usdPlus.balanceOf(account);

    //     // call again to change state
    //     let receipt = await (await wrappedUsdPlus.withdraw(mintedWrappedAmount * 2, account, account)).wait();

    //     const withdrawEvent = receipt.events.find((e) => e.event === 'Withdraw' && e.args[0] === account);
    //     expect(withdrawEvent.args[3].toString()).to.equals(String(mintedWrappedAmount * 2));

    //     expect(await usdPlus.balanceOf(wrappedUsdPlus.address)).to.equals(0);
    //     expect(await wrappedUsdPlus.balanceOf(account)).to.equals(0);

    //     expect((await usdPlus.balanceOf(account)).toString()).to.equals(
    //         new BN(usdPlusBalanceBefore.toString())
    //             .add(new BN((await wrappedUsdPlus.convertToAssets(transferredUnwrappedAmount)).toString()))
    //             .toString()
    //     );
    // });

    // it("withdraw another owner", async function () {
    //     const [owner, tmpUser] = await ethers.getSigners();

    //     let liquidityIndex = new BN(10).pow(new BN(27)); // 10^27
    //     await exchange.setLiquidityIndex(liquidityIndex.toString());

    //     let usdcAmountToMint = 250;
    //     let sharesToMint = await wrappedUsdPlus.convertToShares(usdcAmountToMint);

    //     await expectRevert(
    //         wrappedUsdPlus.callStatic.withdraw(usdcAmountToMint, account, tmpUser.address),
    //         'Withdraw amount exceeds allowance',
    //     );

    //     await usdc.approve(exchange.address, usdcAmountToMint);
    //     await exchange.buy(usdc.address, usdcAmountToMint);
    //     await usdPlus.approve(wrappedUsdPlus.address, usdcAmountToMint);

    //     // callStatic doesn't change state but return value
    //     let mintedWrappedAmount = await wrappedUsdPlus.callStatic.mint(sharesToMint, tmpUser.address);
    //     expect(mintedWrappedAmount.toString()).to.equals(await wrappedUsdPlus.previewMint(sharesToMint));

    //     // call again to change state
    //     await (await wrappedUsdPlus.mint(sharesToMint, tmpUser.address)).wait();

    //     liquidityIndex = new BN(10).pow(new BN(27)).muln(2); // 2*10^27
    //     await exchange.setLiquidityIndex(liquidityIndex.toString());

    //     expect(await usdPlus.balanceOf(wrappedUsdPlus.address)).to.equals(mintedWrappedAmount * 2);
    //     expect(await usdPlus.balanceOf(account)).to.equals(0);
    //     expect(await wrappedUsdPlus.balanceOf(tmpUser.address)).to.equals(sharesToMint);

    //     await wrappedUsdPlus.connect(tmpUser).approve(account, sharesToMint);
    //     expect(await wrappedUsdPlus.allowance(tmpUser.address, account)).to.equals(sharesToMint);

    //     // callStatic doesn't change state but return value
    //     let transferredUnwrappedAmount = await wrappedUsdPlus.callStatic.withdraw(mintedWrappedAmount * 2, account, tmpUser.address);
    //     expect(transferredUnwrappedAmount.toString()).to.equals(await wrappedUsdPlus.previewWithdraw(mintedWrappedAmount * 2));

    //     let usdPlusBalanceBefore = await usdPlus.balanceOf(account);

    //     // call again to change state
    //     let receipt = await (await wrappedUsdPlus.withdraw(mintedWrappedAmount * 2, account, tmpUser.address)).wait();

    //     expect(await usdPlus.balanceOf(wrappedUsdPlus.address)).to.equals(0);
    //     expect(await wrappedUsdPlus.balanceOf(account)).to.equals(0);
    //     expect(await wrappedUsdPlus.balanceOf(tmpUser.address)).to.equals(0);
    //     expect(await wrappedUsdPlus.allowance(tmpUser.address, account)).to.equals(0);

    //     expect((await usdPlus.balanceOf(account)).toString()).to.equals(
    //         new BN(usdPlusBalanceBefore.toString())
    //             .add(new BN((await wrappedUsdPlus.convertToAssets(transferredUnwrappedAmount)).toString()))
    //             .toString()
    //     );
    // });

    // it("mint and withdraw 2:1", async function () {
    //     let liquidityIndex = new BN(10).pow(new BN(27)); // 10^27
    //     await exchange.setLiquidityIndex(liquidityIndex.toString());

    //     let usdcAmountToMint = 250;
    //     let sharesToMint = await wrappedUsdPlus.convertToShares(usdcAmountToMint);

    //     expect(await usdPlus.balanceOf(wrappedUsdPlus.address)).to.equals(0);
    //     expect(await usdPlus.balanceOf(account)).to.equals(0);
    //     expect(await wrappedUsdPlus.balanceOf(account)).to.equals(0);

    //     await usdc.approve(exchange.address, usdcAmountToMint);
    //     await exchange.buy(usdc.address, usdcAmountToMint);
    //     await usdPlus.approve(wrappedUsdPlus.address, usdcAmountToMint);

    //     // callStatic doesn't change state but return value
    //     let mintedWrappedAmount = await wrappedUsdPlus.callStatic.mint(sharesToMint, account);
    //     expect(mintedWrappedAmount.toString()).to.equals(await wrappedUsdPlus.previewWithdraw(sharesToMint));

    //     // call again to change state
    //     await (await wrappedUsdPlus.mint(sharesToMint, account)).wait();

    //     liquidityIndex = new BN(10).pow(new BN(27)).muln(2); // 2*10^27
    //     await exchange.setLiquidityIndex(liquidityIndex.toString());

    //     expect(await usdPlus.balanceOf(wrappedUsdPlus.address)).to.equals(mintedWrappedAmount * 2);
    //     expect(await usdPlus.balanceOf(account)).to.equals(0);
    //     expect(await wrappedUsdPlus.balanceOf(account)).to.equals(sharesToMint);

    //     // callStatic doesn't change state but return value
    //     let transferredUnwrappedAmount = await wrappedUsdPlus.callStatic.withdraw(mintedWrappedAmount, account, account);
    //     expect(transferredUnwrappedAmount.toString()).to.equals(await wrappedUsdPlus.previewWithdraw(mintedWrappedAmount));

    //     let usdPlusBalanceBefore = await usdPlus.balanceOf(account);

    //     // call again to change state
    //     let receipt = await (await wrappedUsdPlus.withdraw(mintedWrappedAmount, account, account)).wait();

    //     expect(await usdPlus.balanceOf(wrappedUsdPlus.address)).to.equals(250);
    //     expect(await wrappedUsdPlus.balanceOf(account)).to.equals(125);

    //     expect((await usdPlus.balanceOf(account)).toString()).to.equals(
    //         new BN(usdPlusBalanceBefore.toString())
    //             .add(new BN((await wrappedUsdPlus.convertToAssets(transferredUnwrappedAmount)).toString()))
    //             .toString()
    //     );
    // });

    // it("usd+ before deposit - usd+ after redeem = 2 if LiquidityIndex don't grow", async function () {
    //     // set LiquidityIndex
    //     await exchange.setLiquidityIndex('1030604144042764124558114376');

    //     // buy usd+
    //     let wrappedAmount = 20240461;
    //     await usdc.approve(exchange.address, wrappedAmount);
    //     await exchange.buy(usdc.address, wrappedAmount);

    //     // deposit wusd+
    //     let usdPlusBalanceBefore = await usdPlus.balanceOf(account);
    //     await usdPlus.approve(wrappedUsdPlus.address, usdPlusBalanceBefore);
    //     let mintedWrappedAmount = await wrappedUsdPlus.callStatic.deposit(usdPlusBalanceBefore, account);
    //     await wrappedUsdPlus.deposit(usdPlusBalanceBefore, account);
    //     let wrappedUsdPlusBalance = await wrappedUsdPlus.balanceOf(account);
    //     expect(mintedWrappedAmount).to.equals(wrappedUsdPlusBalance);

    //     // redeem wusd+
    //     let unwrappedAmount = await wrappedUsdPlus.callStatic.redeem(wrappedUsdPlusBalance, account, account);
    //     await wrappedUsdPlus.redeem(wrappedUsdPlusBalance, account, account);
    //     let usdPlusBalanceAfter = await usdPlus.balanceOf(account);
    //     expect(usdPlusBalanceAfter).to.equals(unwrappedAmount);

    //     expect(usdPlusBalanceBefore - usdPlusBalanceAfter).to.equals(2);
    // });

    // it("usd+ before deposit - usd+ after redeem = 1 if LiquidityIndex don't grow", async function () {
    //     // set LiquidityIndex
    //     await exchange.setLiquidityIndex('1030604134042764124558114376');

    //     // buy usd+
    //     let wrappedAmount = 20240461;
    //     await usdc.approve(exchange.address, wrappedAmount);
    //     await exchange.buy(usdc.address, wrappedAmount);

    //     // deposit wusd+
    //     let usdPlusBalanceBefore = await usdPlus.balanceOf(account);
    //     await usdPlus.approve(wrappedUsdPlus.address, usdPlusBalanceBefore);
    //     let mintedWrappedAmount = await wrappedUsdPlus.callStatic.deposit(usdPlusBalanceBefore, account);
    //     await wrappedUsdPlus.deposit(usdPlusBalanceBefore, account);
    //     let wrappedUsdPlusBalance = await wrappedUsdPlus.balanceOf(account);
    //     expect(mintedWrappedAmount).to.equals(wrappedUsdPlusBalance);

    //     // redeem wusd+
    //     let unwrappedAmount = await wrappedUsdPlus.callStatic.redeem(wrappedUsdPlusBalance, account, account);
    //     await wrappedUsdPlus.redeem(wrappedUsdPlusBalance, account, account);
    //     let usdPlusBalanceAfter = await usdPlus.balanceOf(account);
    //     expect(usdPlusBalanceAfter).to.equals(unwrappedAmount);

    //     expect(usdPlusBalanceBefore - usdPlusBalanceAfter).to.equals(1);
    // });

    // it("usd+ before deposit - usd+ after redeem = 0 if LiquidityIndex don't grow", async function () {
    //     // buy usd+
    //     let wrappedAmount = 20240461;
    //     await usdc.approve(exchange.address, wrappedAmount);
    //     await exchange.buy(usdc.address, wrappedAmount);

    //     // deposit wusd+
    //     let usdPlusBalanceBefore = await usdPlus.balanceOf(account);
    //     await usdPlus.approve(wrappedUsdPlus.address, usdPlusBalanceBefore);
    //     let mintedWrappedAmount = await wrappedUsdPlus.callStatic.deposit(usdPlusBalanceBefore, account);
    //     await wrappedUsdPlus.deposit(usdPlusBalanceBefore, account);
    //     let wrappedUsdPlusBalance = await wrappedUsdPlus.balanceOf(account);
    //     expect(mintedWrappedAmount).to.equals(wrappedUsdPlusBalance);

    //     // redeem wusd+
    //     let unwrappedAmount = await wrappedUsdPlus.callStatic.redeem(wrappedUsdPlusBalance, account, account);
    //     await wrappedUsdPlus.redeem(wrappedUsdPlusBalance, account, account);
    //     let usdPlusBalanceAfter = await usdPlus.balanceOf(account);
    //     expect(usdPlusBalanceAfter).to.equals(unwrappedAmount);

    //     expect(usdPlusBalanceBefore - usdPlusBalanceAfter).to.equals(0);
    // });

    // it("usd+ before deposit - usd+ after redeem = 2 if LiquidityIndex small grow", async function () {
    //     // set LiquidityIndex
    //     await exchange.setLiquidityIndex('1030604144042764124558114376');

    //     // buy usd+
    //     let wrappedAmount = 20240461;
    //     await usdc.approve(exchange.address, wrappedAmount);
    //     await exchange.buy(usdc.address, wrappedAmount);

    //     // deposit wusd+
    //     let usdPlusBalanceBefore = await usdPlus.balanceOf(account);
    //     await usdPlus.approve(wrappedUsdPlus.address, usdPlusBalanceBefore);
    //     let mintedWrappedAmount = await wrappedUsdPlus.callStatic.deposit(usdPlusBalanceBefore, account);
    //     await wrappedUsdPlus.deposit(usdPlusBalanceBefore, account);
    //     let wrappedUsdPlusBalance = await wrappedUsdPlus.balanceOf(account);
    //     expect(mintedWrappedAmount).to.equals(wrappedUsdPlusBalance);

    //     // set new LiquidityIndex
    //     await exchange.setLiquidityIndex('1030604144052764124558114376');

    //     // redeem wusd+
    //     let unwrappedAmount = await wrappedUsdPlus.callStatic.redeem(wrappedUsdPlusBalance, account, account);
    //     await wrappedUsdPlus.redeem(wrappedUsdPlusBalance, account, account);
    //     let usdPlusBalanceAfter = await usdPlus.balanceOf(account);
    //     expect(usdPlusBalanceAfter).to.equals(unwrappedAmount);

    //     expect(usdPlusBalanceBefore - usdPlusBalanceAfter).to.equals(2);
    // });

    // it("usd+ before deposit - usd+ after redeem = 1 if LiquidityIndex small grow", async function () {
    //     // set LiquidityIndex
    //     await exchange.setLiquidityIndex('1030604144042764124558114376');

    //     // buy usd+
    //     let wrappedAmount = 20240461;
    //     await usdc.approve(exchange.address, wrappedAmount);
    //     await exchange.buy(usdc.address, wrappedAmount);

    //     // deposit wusd+
    //     let usdPlusBalanceBefore = await usdPlus.balanceOf(account);
    //     await usdPlus.approve(wrappedUsdPlus.address, usdPlusBalanceBefore);
    //     let mintedWrappedAmount = await wrappedUsdPlus.callStatic.deposit(usdPlusBalanceBefore, account);
    //     await wrappedUsdPlus.deposit(usdPlusBalanceBefore, account);
    //     let wrappedUsdPlusBalance = await wrappedUsdPlus.balanceOf(account);
    //     expect(mintedWrappedAmount).to.equals(wrappedUsdPlusBalance);

    //     // set new LiquidityIndex
    //     await exchange.setLiquidityIndex('1030604168542764124558114376');

    //     // redeem wusd+
    //     let unwrappedAmount = await wrappedUsdPlus.callStatic.redeem(wrappedUsdPlusBalance, account, account);
    //     await wrappedUsdPlus.redeem(wrappedUsdPlusBalance, account, account);
    //     let usdPlusBalanceAfter = await usdPlus.balanceOf(account);
    //     expect(usdPlusBalanceAfter).to.equals(unwrappedAmount);

    //     expect(usdPlusBalanceBefore - usdPlusBalanceAfter).to.equals(1);
    // });

    // it("usd+ before deposit = usd+ after redeem if LiquidityIndex small grow", async function () {
    //     // set LiquidityIndex
    //     await exchange.setLiquidityIndex('1030604134042764124558114376');

    //     // buy usd+
    //     let wrappedAmount = 20240461;
    //     await usdc.approve(exchange.address, wrappedAmount);
    //     await exchange.buy(usdc.address, wrappedAmount);

    //     // deposit wusd+
    //     let usdPlusBalanceBefore = await usdPlus.balanceOf(account);
    //     await usdPlus.approve(wrappedUsdPlus.address, usdPlusBalanceBefore);
    //     let mintedWrappedAmount = await wrappedUsdPlus.callStatic.deposit(usdPlusBalanceBefore, account);
    //     await wrappedUsdPlus.deposit(usdPlusBalanceBefore, account);
    //     let wrappedUsdPlusBalance = await wrappedUsdPlus.balanceOf(account);
    //     expect(mintedWrappedAmount).to.equals(wrappedUsdPlusBalance);

    //     // set new LiquidityIndex
    //     await exchange.setLiquidityIndex('1030604168542764124558114376');

    //     // redeem wusd+
    //     let unwrappedAmount = await wrappedUsdPlus.callStatic.redeem(wrappedUsdPlusBalance, account, account);
    //     await wrappedUsdPlus.redeem(wrappedUsdPlusBalance, account, account);
    //     let usdPlusBalanceAfter = await usdPlus.balanceOf(account);
    //     expect(usdPlusBalanceAfter).to.equals(unwrappedAmount);

    //     expect(usdPlusBalanceBefore - usdPlusBalanceAfter).to.equals(0);
    // });

});




