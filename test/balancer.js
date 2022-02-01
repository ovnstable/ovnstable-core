let { MerkleTree, Claim } = require('./merkleTree.js');
const {expect} = require("chai");
const chai = require("chai");
const {deployments, ethers, getNamedAccounts} = require('hardhat');
const {FakeContract, smock} = require("@defi-wonderland/smock");
const BN = require("bn.js");
const fs = require("fs");
const {fromBpsp, toBpsp, toUSDC, fromUSDC, fromWmatic} = require("../utils/decimals");
const hre = require("hardhat");
let assets = JSON.parse(fs.readFileSync('./assets.json'));

chai.use(smock.matchers);

function encodeElement(address, balance) {
    return ethers.utils.solidityKeccak256(['address', 'uint'], [address, balance]);
}

describe("Balancer", function () {

    let vault;
    let rm;
    let usdc;
    let account;
    let connectorBalancer;
//    let merkleOrchard;
    let balPriceGetter;
    let tUsdPriceGetter;
    let bpspTUsdPriceGetter;
    let bpspTUsd;
    let tUsd;
    let bal;
    let wMatic;

    beforeEach(async () => {
        // need to run inside IDEA via node script running
        await hre.run("compile");

        await deployments.fixture(['Setting', 'setting', 'base', 'BuyUsdc']);

        const {deployer} = await getNamedAccounts();
        account = deployer;
        vault = await ethers.getContract("Vault");
        rm = await ethers.getContract("RewardManager");
        connectorBalancer = await ethers.getContract("ConnectorBalancer");
//        merkleOrchard = await ethers.getContract("MerkleOrchard");
        balPriceGetter = await ethers.getContract("BalPriceGetter");
        tUsdPriceGetter = await ethers.getContract("TUsdPriceGetter");
        bpspTUsdPriceGetter = await ethers.getContract("BpspTUsdPriceGetter");
        usdc = await ethers.getContractAt("ERC20", assets.usdc);
        bpspTUsd = await ethers.getContractAt("ERC20", assets.bpspTUsd);
        tUsd = await ethers.getContractAt("ERC20", assets.tUsd);
        bal = await ethers.getContractAt("ERC20", assets.bal);
        wMatic = await ethers.getContractAt("ERC20", assets.wMatic);

        vault.setPortfolioManager(account);
    });

    it("Staking USDC", async function () {
        const sum = toUSDC(100);

        // stake
        await usdc.transfer(connectorBalancer.address, sum);
        let balanceUsdc = await usdc.balanceOf(connectorBalancer.address);
        console.log('Balance usdc before stake: ' + balanceUsdc);

        await connectorBalancer.stake(usdc.address, sum, vault.address);
        let balanceBpspTUsd = await bpspTUsd.balanceOf(vault.address);
        console.log('Balance bpspTUsd after stake: ' + balanceBpspTUsd);

        expect(balanceBpspTUsd).not.equal(0);
    });

    it("Unstaking USDC", async function () {
        const sum = toUSDC(100);

        // stake
        await usdc.transfer(connectorBalancer.address, sum);
        let balanceUsdc = await usdc.balanceOf(connectorBalancer.address);
        console.log('Balance usdc before stake: ' + balanceUsdc);

        await connectorBalancer.stake(usdc.address, sum, vault.address);
        let balanceBpspTUsd = await bpspTUsd.balanceOf(vault.address);
        console.log('Balance bpspTUsd after stake: ' + balanceBpspTUsd);

        expect(balanceBpspTUsd).not.equal(0);

        // unstake
        balanceBpspTUsd = await bpspTUsd.balanceOf(vault.address);
        await vault.transfer(bpspTUsd.address, connectorBalancer.address, balanceBpspTUsd)
        console.log('Balance bpspTUsd before unstake: ' + balanceBpspTUsd);

        await connectorBalancer.unstake(usdc.address, balanceBpspTUsd, vault.address);
        balanceUsdc = await usdc.balanceOf(vault.address);
        console.log('Balance usdc after unstake: ' + balanceUsdc);

        expect(balanceUsdc).not.equal(0);
    });

    it("Unstaking USDC with timeout", async function () {
        const sum = toUSDC(100);

        // stake
        await usdc.transfer(connectorBalancer.address, sum);
        let balanceUsdc = await usdc.balanceOf(connectorBalancer.address);
        console.log('Balance usdc before stake: ' + balanceUsdc);

        await connectorBalancer.stake(usdc.address, sum, vault.address);
        let balanceBpspTUsd = await bpspTUsd.balanceOf(vault.address);
        console.log('Balance bpspTUsd after stake: ' + balanceBpspTUsd);

        expect(balanceBpspTUsd).not.equal(0);

        // timeout 7 days
        const sevenDays = 7 * 24 * 60 * 60;
        await ethers.provider.send("evm_increaseTime", [sevenDays])
        await ethers.provider.send('evm_mine');

        // unstake
        balanceBpspTUsd = await bpspTUsd.balanceOf(vault.address);
        await vault.transfer(bpspTUsd.address, connectorBalancer.address, balanceBpspTUsd)
        console.log('Balance bpspTUsd before unstake: ' + balanceBpspTUsd);

        await connectorBalancer.unstake(usdc.address, balanceBpspTUsd, vault.address);
        balanceUsdc = await usdc.balanceOf(vault.address);
        console.log('Balance usdc after unstake: ' + balanceUsdc);

        expect(balanceUsdc).not.equal(0);
    });

    it("Unstaking USDC by parts", async function () {
        const sum = toUSDC(100);

        // stake
        await usdc.transfer(connectorBalancer.address, sum);
        let balanceUsdc = await usdc.balanceOf(connectorBalancer.address);
        console.log('Balance usdc before stake: ' + balanceUsdc);

        await connectorBalancer.stake(usdc.address, sum, vault.address);
        let balanceBpspTUsd = await bpspTUsd.balanceOf(vault.address);
        console.log('Balance bpspTUsd after stake: ' + balanceBpspTUsd);

        expect(balanceBpspTUsd).not.equal(0);

        // unstake
        balanceBpspTUsd = await bpspTUsd.balanceOf(vault.address);
        await vault.transfer(bpspTUsd.address, connectorBalancer.address, balanceBpspTUsd)
        console.log('Balance bpspTUsd before unstake: ' + balanceBpspTUsd);

        await connectorBalancer.unstake(usdc.address, balanceBpspTUsd, vault.address);
        balanceUsdc = await usdc.balanceOf(vault.address);
        console.log('Balance usdc after unstake: ' + balanceUsdc);

        expect(balanceUsdc).not.equal(0);

        // Balance after 1 unstake
        let balanceFinal1 = balanceUsdc;

        // stake
        await vault.transfer(usdc.address, connectorBalancer.address, balanceFinal1);
        await usdc.transfer(connectorBalancer.address, sum - balanceFinal1);
        balanceUsdc = await usdc.balanceOf(connectorBalancer.address);
        console.log('Balance usdc before stake: ' + balanceUsdc);

        await connectorBalancer.stake(usdc.address, sum, vault.address);
        balanceBpspTUsd = await bpspTUsd.balanceOf(vault.address);
        console.log('Balance bpspTUsd after stake: ' + balanceBpspTUsd);

        expect(balanceBpspTUsd).not.equal(0);

        // 5 unstakes
        balanceBpspTUsd = await bpspTUsd.balanceOf(vault.address);
        await vault.transfer(bpspTUsd.address, connectorBalancer.address, balanceBpspTUsd)
        console.log('Balance bpspTUsd before unstake: ' + balanceBpspTUsd);

        // Balance for part unstake
        let balancePart = BigInt(balanceBpspTUsd) / 5n;
        console.log('BalancePart: ' + balancePart);

        // unstake 1
        await connectorBalancer.unstake(usdc.address, balancePart, vault.address);
        balanceUsdc = await usdc.balanceOf(vault.address);
        console.log('Balance usdc after 1 unstake: ' + balanceUsdc);

        // unstake 2
        await connectorBalancer.unstake(usdc.address, balancePart, vault.address);
        balanceUsdc = await usdc.balanceOf(vault.address);
        console.log('Balance usdc after 2 unstake: ' + balanceUsdc);

        // unstake 3
        await connectorBalancer.unstake(usdc.address, balancePart, vault.address);
        balanceUsdc = await usdc.balanceOf(vault.address);
        console.log('Balance usdc after 3 unstake: ' + balanceUsdc);

        // unstake 4
        await connectorBalancer.unstake(usdc.address, balancePart, vault.address);
        balanceUsdc = await usdc.balanceOf(vault.address);
        console.log('Balance usdc after 4 unstake: ' + balanceUsdc);

        // unstake 5
        balanceBpspTUsd = await bpspTUsd.balanceOf(connectorBalancer.address);
        await connectorBalancer.unstake(usdc.address, balanceBpspTUsd, vault.address);
        balanceUsdc = await usdc.balanceOf(vault.address);
        console.log('Balance usdc after 5 unstake: ' + balanceUsdc);

        expect(balanceUsdc).not.equal(0);

        // Balance after 5 unstakes
        let balanceFinal2 = balanceUsdc;

        // Delta after 1 unstake and 5 unstakes
        let delta = Math.abs(balanceFinal1 - balanceFinal2);
        console.log('delta: ' + delta);

        expect(delta).to.greaterThanOrEqual(0);
        expect(delta).to.lessThanOrEqual(5);

        // Unstaked all bpspTUsd
        balanceBpspTUsd = await bpspTUsd.balanceOf(vault.address);
        console.log('Balance bpspTUsd after 5 unstake: ' + balanceBpspTUsd);

        expect(balanceBpspTUsd).equal(0);
    });

    it("Get price bal", async function () {
        // balPriceGetter
        let buyPrice = await balPriceGetter.getUsdcBuyPrice();
        console.log('BuyPrice bal in usdc: ' + buyPrice);
        let sellPrice = await balPriceGetter.getUsdcSellPrice();
        console.log('SellPrice bal in usdc: ' + sellPrice);

        let percent = Math.abs(buyPrice - sellPrice) / sellPrice;

        expect(percent).to.lessThan(20);
    });

    it("Get price tUsd", async function () {
        // tUsdPriceGetter
        let buyPrice = await tUsdPriceGetter.getUsdcBuyPrice();
        console.log('BuyPrice tUsd in usdc: ' + buyPrice);
        let sellPrice = await tUsdPriceGetter.getUsdcSellPrice();
        console.log('SellPrice tUsd in usdc: ' + sellPrice);

        let percent = Math.abs(buyPrice - sellPrice) / sellPrice;

        expect(percent).to.lessThan(20);
    });

    it("Get price bpspTUsd", async function () {
        // bpspTUsdPriceGetter
        let buyPrice = await bpspTUsdPriceGetter.getUsdcBuyPrice();
        console.log('BuyPrice bpspTUsd in usdc: ' + buyPrice);
        let sellPrice = await bpspTUsdPriceGetter.getUsdcSellPrice();
        console.log('SellPrice bpspTUsd in usdc: ' + sellPrice);

        let percent = Math.abs(buyPrice - sellPrice) / sellPrice;

        expect(percent).to.lessThan(20);
    });

    //TODO: Balancer. FIX claiming
//    it("Claiming rewards", async function () {
//        const sum = toUSDC(100);
//
//        // stake
//        await usdc.transfer(connectorBalancer.address, sum);
//        let balanceUsdc = await usdc.balanceOf(connectorBalancer.address);
//        console.log('Balance usdc before stake: ' + balanceUsdc);
//
//        await connectorBalancer.stake(usdc.address, sum, vault.address);
//        let balanceBpspTUsd = await bpspTUsd.balanceOf(vault.address);
//        console.log('Balance bpspTUsd after stake: ' + balanceBpspTUsd);
//
//        // timeout 7 days
//        const sevenDays = 7 * 24 * 60 * 60;
//        await ethers.provider.send("evm_increaseTime", [sevenDays])
//        await ethers.provider.send('evm_mine');
//
//        // claiming
////        let distributionId1 = await merkleOrchard.getNextDistributionId(bal.address, vault.address);
////        let distributionId2 = await merkleOrchard.getNextDistributionId(tUsd.address, vault.address);
////        let distributionId3 = await merkleOrchard.getNextDistributionId(wMatic.address, vault.address);
//
//        let claimedBalance1 = await merkleOrchard.getRemainingBalance(bal.address, vault.address);
//        let claimedBalance2 = await merkleOrchard.getRemainingBalance(tUsd.address, vault.address);
//        let claimedBalance3 = await merkleOrchard.getRemainingBalance(wMatic.address, vault.address);
//        console.log('claimedBalance1 on vault: ' + claimedBalance1);
//        console.log('claimedBalance2 on vault: ' + claimedBalance2);
//        console.log('claimedBalance3 on vault: ' + claimedBalance3);
//
//        const elements1 = [encodeElement(connectorBalancer.address, 0)];
//        const merkleTree1 = new MerkleTree(elements1);
//        const elements2 = [encodeElement(connectorBalancer.address, 0)];
//        const merkleTree2 = new MerkleTree(elements2);
//        const elements3 = [encodeElement(connectorBalancer.address, 0)];
//        const merkleTree3 = new MerkleTree(elements3);
//
//        const proof1 = merkleTree1.getHexProof(elements1[0]);
//        const proof2 = merkleTree2.getHexProof(elements2[0]);
//        const proof3 = merkleTree3.getHexProof(elements3[0]);
//
////        const claims = [
////            {
////                distributionId: distributionId1,
////                balance: claimedBalance1,
////                distributor: connectorBalancer.address,
////                tokenIndex: 0,
////                merkleProof: proof1,
////            },
////            {
////                distributionId: distributionId2,
////                balance: claimedBalance2,
////                distributor: connectorBalancer.address,
////                tokenIndex: 1,
////                merkleProof: proof2,
////            },
////            {
////                distributionId: distributionId3,
////                balance: claimedBalance3,
////                distributor: connectorBalancer.address,
////                tokenIndex: 2,
////                merkleProof: proof3,
////            },
////        ];
////
////        let tokens = [bal, tUsd, wMatic];
//
//        rm.claimRewardBalancer(proof1, proof2, proof3);
//
//    });

});
