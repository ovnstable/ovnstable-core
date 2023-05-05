const { expect } = require("chai");
const { deployments, ethers, getNamedAccounts } = require("hardhat");
const BN = require("bn.js");
const hre = require("hardhat");
let { POLYGON } = require('@overnight-contracts/common/utils/assets');
const { sharedBeforeEach } = require("@overnight-contracts/common/utils/sharedBeforeEach");


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
});




