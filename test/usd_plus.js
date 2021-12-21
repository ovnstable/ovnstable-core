const {expect} = require("chai");
const chai = require("chai");
const {deployments, ethers, getNamedAccounts} = require("hardhat");
const {FakeContract, smock} = require("@defi-wonderland/smock");
const BN = require("bn.js");

let decimals = require('../utils/decimals');

const fs = require("fs");
const {fromIdle, toIdle, toUSDC, fromUSDC, fromWmatic} = require("../utils/decimals");
const hre = require("hardhat");
let assets = JSON.parse(fs.readFileSync("./assets.json"));

chai.use(smock.matchers);

describe("Usd Plus", function () {

    let account;
    let usdPlus;

    beforeEach(async () => {
        // need to run inside IDEA via node script running
        await hre.run("compile");

        await deployments.fixture(["UsdPlusToken"]);

        const {deployer} = await getNamedAccounts();
        account = deployer;
        usdPlus = await ethers.getContract("UsdPlusToken");
        usdPlus.setExchanger(account);
    });


    it("Mint with default liq index", async function () {

        let newLiquidityIndex = new BN(10).pow(new BN(27)); // 10^27
        await usdPlus.setLiquidityIndex(newLiquidityIndex.toString());

        await usdPlus.mint(account, 1);
        let scaledBalance = await usdPlus.scaledBalanceOf(account);
        console.log("ScaledBalance usdPlus: " + scaledBalance);
        expect(scaledBalance).to.equals(1000000000); // stored as rays

        let balance = await usdPlus.balanceOf(account);
        console.log("Balance usdPlus: " + balance);
        expect(balance).to.equals(1);

    });

    it("Mint with half liq index", async function () {

        let newLiquidityIndex = new BN(10).pow(new BN(27)).divn(2); // 5*10^26
        await usdPlus.setLiquidityIndex(newLiquidityIndex.toString());

        await usdPlus.mint(account, 1);

        let scaledBalance = await usdPlus.scaledBalanceOf(account);
        console.log("ScaledBalance usdPlus: " + scaledBalance);
        expect(scaledBalance).to.equals(2000000000); // stored as rays

        let balance = await usdPlus.balanceOf(account);
        console.log("Balance usdPlus: " + balance);
        expect(balance).to.equals(1);

    });

    it("Mint with double liq index", async function () {

        let newLiquidityIndex = new BN(10).pow(new BN(27)).muln(2); // 2*10^27
        await usdPlus.setLiquidityIndex(newLiquidityIndex.toString());

        await usdPlus.mint(account, 1);

        let scaledBalance = await usdPlus.scaledBalanceOf(account);
        console.log("ScaledBalance usdPlus: " + scaledBalance);
        expect(scaledBalance).to.equals(500000000); // stored as rays

        let balance = await usdPlus.balanceOf(account);
        console.log("Balance usdPlus: " + balance);
        expect(balance).to.equals(1);

    });

    it("Burn with default liq index", async function () {

        let newLiquidityIndex = new BN(10).pow(new BN(27)); // 10^27
        await usdPlus.setLiquidityIndex(newLiquidityIndex.toString());

        await usdPlus.mint(account, 2);
        await usdPlus.burn(account, 1);

        let scaledBalance = await usdPlus.scaledBalanceOf(account);
        console.log("ScaledBalance usdPlus: " + scaledBalance);
        expect(scaledBalance).to.equals(1000000000); // stored as rays

        let balance = await usdPlus.balanceOf(account);
        console.log("Balance usdPlus: " + balance);
        expect(balance).to.equals(1);

    });

    it("Burn with half liq index", async function () {

        let newLiquidityIndex = new BN(10).pow(new BN(27)).divn(2); // 5*10^26
        await usdPlus.setLiquidityIndex(newLiquidityIndex.toString());

        await usdPlus.mint(account, 2);
        await usdPlus.burn(account, 1);

        let scaledBalance = await usdPlus.scaledBalanceOf(account);
        console.log("ScaledBalance usdPlus: " + scaledBalance);
        expect(scaledBalance).to.equals(2000000000); // stored as rays

        let balance = await usdPlus.balanceOf(account);
        console.log("Balance usdPlus: " + balance);
        expect(balance).to.equals(1);

    });

    it("Burn with double liq index", async function () {

        let newLiquidityIndex = new BN(10).pow(new BN(27)).muln(2); // 2*10^27
        await usdPlus.setLiquidityIndex(newLiquidityIndex.toString());

        await usdPlus.mint(account, 2);
        await usdPlus.burn(account, 1);

        let scaledBalance = await usdPlus.scaledBalanceOf(account);
        console.log("ScaledBalance usdPlus: " + scaledBalance);
        expect(scaledBalance).to.equals(500000000); // stored as rays

        let balance = await usdPlus.balanceOf(account);
        console.log("Balance usdPlus: " + balance);
        expect(balance).to.equals(1);

    });

    it("Mint burn with complex liq index", async function () {

        let newLiquidityIndex = new BN("1022809482605723771055655202");
        await usdPlus.setLiquidityIndex(newLiquidityIndex.toString());

        await usdPlus.mint(account, 234141374);
        await usdPlus.burn(account, 93143413);

        let scaledBalance = await usdPlus.scaledBalanceOf(account);
        console.log("ScaledBalance usdPlus: " + scaledBalance);

        let balance = await usdPlus.balanceOf(account);
        console.log("Balance usdPlus: " + balance);
        expect(balance).to.equals(140997961);

    });


    it("Mint burn with changing liq index", async function () {

        let firstLiquidityIndex = new BN(10).pow(new BN(27)).divn(2); // 5*10^26
        await usdPlus.setLiquidityIndex(firstLiquidityIndex.toString());

        await usdPlus.mint(account, 16);

        let balance = await usdPlus.balanceOf(account);
        console.log("Balance usdPlus: " + balance);
        expect(balance).to.equals(16)

        let secondLiquidityIndex = new BN(10).pow(new BN(27)).muln(2); // 2*10^27
        await usdPlus.setLiquidityIndex(secondLiquidityIndex.toString());

        balance = await usdPlus.balanceOf(account);
        console.log("Balance usdPlus: " + balance);
        expect(balance).to.equals(64);

        await usdPlus.burn(account, 16);

        balance = await usdPlus.balanceOf(account);
        console.log("Balance usdPlus: " + balance);
        expect(balance).to.equals(48);

        await usdPlus.setLiquidityIndex(firstLiquidityIndex.toString());

        balance = await usdPlus.balanceOf(account);
        console.log("Balance usdPlus: " + balance);
        expect(balance).to.equals(12);

    });


    it("Total supply with default liq index", async function () {

        let newLiquidityIndex = new BN(10).pow(new BN(27)); // 10^27
        await usdPlus.setLiquidityIndex(newLiquidityIndex.toString());

        await usdPlus.mint(account, 2);

        let scaledTotalSupply = await usdPlus.scaledTotalSupply();
        console.log("ScaledTotalSupply usdPlus: " + scaledTotalSupply);
        expect(scaledTotalSupply).to.equals(2000000000); // stored as rays

        let totalSupply = await usdPlus.totalSupply();
        console.log("TotalSupply usdPlus: " + totalSupply);
        expect(totalSupply).to.equals(2);

        await usdPlus.burn(account, 1);

        scaledTotalSupply = await usdPlus.scaledTotalSupply();
        console.log("ScaledTotalSupply usdPlus: " + scaledTotalSupply);
        expect(scaledTotalSupply).to.equals(1000000000); // stored as rays

        totalSupply = await usdPlus.totalSupply();
        console.log("TotalSupply usdPlus: " + totalSupply);
        expect(totalSupply).to.equals(1);

    });

    it("Total supply with half liq index", async function () {

        let newLiquidityIndex = new BN(10).pow(new BN(27)).divn(2); // 5*10^26
        await usdPlus.setLiquidityIndex(newLiquidityIndex.toString());

        await usdPlus.mint(account, 2);

        let scaledTotalSupply = await usdPlus.scaledTotalSupply();
        console.log("ScaledTotalSupply usdPlus: " + scaledTotalSupply);
        expect(scaledTotalSupply).to.equals(4000000000); // stored as rays

        let totalSupply = await usdPlus.totalSupply();
        console.log("TotalSupply usdPlus: " + totalSupply);
        expect(totalSupply).to.equals(2);

        await usdPlus.burn(account, 1);

        scaledTotalSupply = await usdPlus.scaledTotalSupply();
        console.log("ScaledTotalSupply usdPlus: " + scaledTotalSupply);
        expect(scaledTotalSupply).to.equals(2000000000); // stored as rays

        totalSupply = await usdPlus.totalSupply();
        console.log("TotalSupply usdPlus: " + totalSupply);
        expect(totalSupply).to.equals(1);

    });

    it("Total supply with double liq index", async function () {

        let newLiquidityIndex = new BN(10).pow(new BN(27)).muln(2); // 2*10^27
        await usdPlus.setLiquidityIndex(newLiquidityIndex.toString());

        await usdPlus.mint(account, 2);

        let scaledTotalSupply = await usdPlus.scaledTotalSupply();
        console.log("ScaledTotalSupply usdPlus: " + scaledTotalSupply);
        expect(scaledTotalSupply).to.equals(1000000000); // stored as rays

        let totalSupply = await usdPlus.totalSupply();
        console.log("TotalSupply usdPlus: " + totalSupply);
        expect(totalSupply).to.equals(2);

        await usdPlus.burn(account, 1);

        scaledTotalSupply = await usdPlus.scaledTotalSupply();
        console.log("ScaledTotalSupply usdPlus: " + scaledTotalSupply);
        expect(scaledTotalSupply).to.equals(500000000); // stored as rays

        totalSupply = await usdPlus.totalSupply();
        console.log("TotalSupply usdPlus: " + totalSupply);
        expect(totalSupply).to.equals(1);

    });

    it("Token owners added/removed", async function () {

        let newLiquidityIndex = new BN("1022809482605723771055655202");
        await usdPlus.setLiquidityIndex(newLiquidityIndex.toString());

        let ownerLength;
        ownerLength = await usdPlus.ownerLength();
        console.log("ownerLength usdPlus: " + ownerLength);
        expect(ownerLength).to.equals(0);

        await usdPlus.mint(account, 93143413);

        ownerLength = await usdPlus.ownerLength();
        console.log("ownerLength usdPlus: " + ownerLength);
        expect(ownerLength).to.equals(1);

        await usdPlus.burn(account, 93143413);

        ownerLength = await usdPlus.ownerLength();
        console.log("ownerLength usdPlus: " + ownerLength);
        expect(ownerLength).to.equals(0);

    });

    it("Token transfer", async function () {
        const [owner, tmpUser] = await ethers.getSigners();

        let firstLiquidityIndex = new BN(10).pow(new BN(27)).divn(2); // 5*10^26
        await usdPlus.setLiquidityIndex(firstLiquidityIndex.toString());

        await usdPlus.mint(account, 16);

        let balance = await usdPlus.balanceOf(account);
        console.log("Balance usdPlus: " + balance);
        expect(balance).to.equals(16)

        await usdPlus.transfer(tmpUser.address, 10);

        balance = await usdPlus.balanceOf(tmpUser.address);
        console.log("tmpUser Balance usdPlus: " + balance);
        expect(balance).to.equals(10);

    });

    it("Token transferFrom", async function () {
        const [owner, tmpUser] = await ethers.getSigners();

        let newLiquidityIndex = new BN("1022809482605723771055655202");
        await usdPlus.setLiquidityIndex(newLiquidityIndex.toString());

        await usdPlus.mint(account, 93143413);

        let balance = await usdPlus.balanceOf(account);
        console.log("Balance usdPlus: " + balance);
        expect(balance).to.equals(93143413)

        await usdPlus.approve(tmpUser.address, 3143413);

        let allowance = await usdPlus.allowance(account, tmpUser.address);
        console.log("allowance usdPlus: " + allowance);
        expect(allowance).to.equals(3143413)

        await usdPlus.connect(tmpUser).transferFrom(account, tmpUser.address, 1143413);

        balance = await usdPlus.balanceOf(tmpUser.address);
        console.log("tmpUser Balance usdPlus: " + balance);
        expect(balance).to.equals(1143413);

        balance = await usdPlus.balanceOf(account);
        console.log("account Balance usdPlus: " + balance);
        expect(balance).to.equals(92000000);

        allowance = await usdPlus.allowance(account, tmpUser.address);
        console.log("allowance usdPlus: " + allowance);
        expect(allowance).to.equals(2000000)

        await expect(usdPlus.connect(tmpUser).transferFrom(account, tmpUser.address, 2100000)).to.be.reverted;

    });
});
