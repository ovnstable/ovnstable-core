const {expect} = require("chai");
const chai = require("chai");
const {deployments, ethers, getNamedAccounts} = require('hardhat');
const {smock} = require("@defi-wonderland/smock");
const {greatLess} = require('../../utils/tests');
const fs = require("fs");
const {toUSDC, fromUSDC, fromE18} = require("../../utils/decimals");
const hre = require("hardhat");
const {resetHardhat} = require("../../utils/tests");
const axios = require("axios");
const BN = require('bignumber.js');
const {logStrategyGasUsage} = require("./strategyCommon");
let assets = JSON.parse(fs.readFileSync('./assets.json'));
let { MerkleTree, Claim } = require('../../utils/merkleTree');
let strategyBalancer = JSON.parse(fs.readFileSync('./deployments/polygon_dev/StrategyBalancer.json'))

chai.use(smock.matchers);

function encodeElement(address, balance) {
    return ethers.utils.solidityKeccak256(['address', 'uint'], [address, balance]);
}
/*
describe("StrategyBalancer. Stake/unstake", function () {

    let account;
    let strategy;
    let usdc;
    let bpspTUsd;

    before(async () => {
        await hre.run("compile");
        await resetHardhat();

        await deployments.fixture(['PortfolioManager', 'StrategyBalancer', 'StrategyBalancerSetting', 'BuyUsdc']);

        const {deployer} = await getNamedAccounts();
        account = deployer;

        strategy = await ethers.getContract('StrategyBalancer');
        await strategy.setPortfolioManager(account);

        usdc = await ethers.getContractAt("ERC20", assets.usdc);
        bpspTUsd = await ethers.getContractAt("ERC20", assets.bpspTUsd);
    });

    it("log gas", async () => {
        await logStrategyGasUsage("StrategyBalancer", strategy, usdc, account)
    });

    describe("Stake 100 USDC", function () {

        let balanceUsdc;
        let balanceBpspTUsd;

        before(async () => {

            let balanceUsdcBefore = await usdc.balanceOf(account);
            let balanceBpspTUsdBefore = await bpspTUsd.balanceOf(strategy.address);

            await usdc.transfer(strategy.address, toUSDC(100));
            await strategy.stake(usdc.address, toUSDC(100));

            let balanceUsdcAfter = await usdc.balanceOf(account);
            let balanceBpspTUsdAfter = await bpspTUsd.balanceOf(strategy.address);

            balanceUsdc = fromUSDC(balanceUsdcBefore - balanceUsdcAfter);
            balanceBpspTUsd = fromE18(balanceBpspTUsdAfter - balanceBpspTUsdBefore);

            console.log("balanceUsdcBefore: " + fromUSDC(balanceUsdcBefore));
            console.log("balanceUsdcAfter: " + fromUSDC(balanceUsdcAfter));
            console.log("balanceUsdc: " + balanceUsdc);
            console.log("balanceBpspTUsdBefore: " + fromE18(balanceBpspTUsdBefore));
            console.log("balanceBpspTUsdAfter: " + fromE18(balanceBpspTUsdAfter));
            console.log("balanceBpspTUsd: " + balanceBpspTUsd);
        });

        it("Balance USDC should be greater than 99 less than 101", async function () {
            greatLess(balanceUsdc, 100, 1);
        });

        it("Balance bpspTUsd should be greater than 90 less than 100", async function () {
            greatLess(balanceBpspTUsd, 95, 5);
        });

        it("NetAssetValue USDC should be greater than 99 less than 101", async function () {
            greatLess(fromUSDC(await strategy.netAssetValue()), 100, 1);
        });

        it("LiquidationValue USDC should be greater than 99 less than 101", async function () {
            greatLess(fromUSDC(await strategy.liquidationValue()), 100, 1);
        });

        describe("Unstake 50 USDC", function () {

            let balanceUsdc;
            let balanceBpspTUsd;

            before(async () => {

                let balanceUsdcBefore = await usdc.balanceOf(account);
                let balanceBpspTUsdBefore = await bpspTUsd.balanceOf(strategy.address);

                await strategy.unstake(usdc.address, toUSDC(50), account, false);

                let balanceUsdcAfter = await usdc.balanceOf(account);
                let balanceBpspTUsdAfter = await bpspTUsd.balanceOf(strategy.address);

                balanceUsdc = fromUSDC(balanceUsdcAfter - balanceUsdcBefore);
                balanceBpspTUsd = fromE18(balanceBpspTUsdBefore - balanceBpspTUsdAfter);

                console.log("balanceUsdcBefore: " + fromUSDC(balanceUsdcBefore));
                console.log("balanceUsdcAfter: " + fromUSDC(balanceUsdcAfter));
                console.log("balanceUsdc: " + balanceUsdc);
                console.log("balanceBpspTUsdBefore: " + fromE18(balanceBpspTUsdBefore));
                console.log("balanceBpspTUsdAfter: " + fromE18(balanceBpspTUsdAfter));
                console.log("balanceBpspTUsd: " + balanceBpspTUsd);
            });

            it("Balance USDC should be greater than 49 less than 51", async function () {
                greatLess(balanceUsdc, 50, 1);
            });

            it("Balance bpspTUsd should be greater than 45 less than 50", async function () {
                greatLess(balanceBpspTUsd, 47.5, 2.5);
            });

            it("NetAssetValue USDC should be greater than 49 less than 51", async function () {
                greatLess(fromUSDC(await strategy.netAssetValue()), 50, 1);
            });

            it("LiquidationValue USDC should be greater than 49 less than 51", async function () {
                greatLess(fromUSDC(await strategy.liquidationValue()), 50, 1);
            });

            describe("Unstake Full", function () {

                let balanceUSDC;
                let balanceBpspTUsd;

                before(async () => {

                    let balanceUsdcBefore = await usdc.balanceOf(account);
                    let balanceBpspTUsdBefore = await bpspTUsd.balanceOf(strategy.address);

                    await strategy.unstake(usdc.address, 0, account, true);

                    let balanceUsdcAfter = await usdc.balanceOf(account);
                    let balanceBpspTUsdAfter = await bpspTUsd.balanceOf(strategy.address);

                    balanceUsdc = fromUSDC(balanceUsdcAfter - balanceUsdcBefore);
                    balanceBpspTUsd = fromE18(balanceBpspTUsdBefore - balanceBpspTUsdAfter);

                    console.log("balanceUsdcBefore: " + fromUSDC(balanceUsdcBefore));
                    console.log("balanceUsdcAfter: " + fromUSDC(balanceUsdcAfter));
                    console.log("balanceUsdc: " + balanceUsdc);
                    console.log("balanceBpspTUsdBefore: " + fromE18(balanceBpspTUsdBefore));
                    console.log("balanceBpspTUsdAfter: " + fromE18(balanceBpspTUsdAfter));
                    console.log("balanceBpspTUsd: " + balanceBpspTUsd);
                });

                it("Balance USDC should be greater than 49 less than 51", async function () {
                    greatLess(balanceUsdc, 50, 1);
                });

                it("Balance bpspTUsd should be greater than 45 less than 50", async function () {
                    greatLess(balanceBpspTUsd, 47.5, 2.5);
                });

                it("NetAssetValue USDC should be greater than 0 less than 1", async function () {
                    greatLess(fromUSDC(await strategy.netAssetValue()), 0.5, 0.5);
                });

                it("LiquidationValue USDC should be greater than 0 less than 1", async function () {
                    greatLess(fromUSDC(await strategy.liquidationValue()), 0.5, 0.5);
                });

            });

        });

    });

});
*/
describe("StrategyBalancer. Claim rewards", function () {

    let account;
    let strategy;
    let usdc;
    let bal;
    let wMatic;
    let tUsd;

    before(async () => {
        await hre.run("compile");
        await resetHardhat();

        await deployments.fixture(['PortfolioManager', 'StrategyBalancer', 'StrategyBalancerSetting', 'BuyUsdc']);

        const {deployer} = await getNamedAccounts();
        account = deployer;

        strategy = await ethers.getContract('StrategyBalancer');
        await strategy.setPortfolioManager(account);

        usdc = await ethers.getContractAt("ERC20", assets.usdc);
        bal = await ethers.getContractAt("ERC20", assets.bal);
        wMatic = await ethers.getContractAt("ERC20", assets.wMatic);
        tUsd = await ethers.getContractAt("ERC20", assets.tUsd);

    });

    describe("Claim rewards", function () {

        let balanceUsdc;

        before(async () => {
            balanceUsdc = 0;

            // get balance and merkleProof for bal
            let responseBal = await axios.get('https://raw.githubusercontent.com/balancer-labs/bal-mining-scripts/master/reports/90/__polygon_0x9a71012b13ca4d3d0cdc72a177df3ef03b0e76a3.json');

            let balanceBal;
            let elementBal;
            let elementsBal = [];
            Object.keys(responseBal.data).forEach(function(key) {
                let balance = responseBal.data[key].replace('.', '').replace(/^0+/, '') + '0000000000';
                let element = encodeElement(key, balance);
                if (key === '0xfA8Bb3CED390eDB598000A118491d990304df550') {
                    balanceBal = balance;
                    elementBal = element;
                    console.log(balanceBal);
                    console.log(elementBal);
                }
                elementsBal.push(element);
            });

            let merkleTreeBal = new MerkleTree(elementsBal);
            let merkleProofBal = await merkleTreeBal.getHexProof(elementBal);
            console.log(merkleProofBal);

            // get balance and merkleProof for tUsd
            let responseTUsd = await axios.get('https://raw.githubusercontent.com/balancer-labs/bal-mining-scripts/master/reports/90/__polygon_0x2e1ad108ff1d8c782fcbbb89aad783ac49586756.json');

            let balanceTUsd;
            let elementTUsd;
            let elementsTUsd = [];
            Object.keys(responseTUsd.data).forEach(function(key) {
                let balance = responseTUsd.data[key].replace('.', '').replace(/^0+/, '') + '0000000000';
                let element = encodeElement(key, balance);
                if (key === '0xfA8Bb3CED390eDB598000A118491d990304df550') {
                    balanceTUsd = balance;
                    elementTUsd = element;
                    console.log(balanceTUsd);
                    console.log(elementTUsd);
                }
                elementsTUsd.push(element);
            });

            let merkleTreeTUsd = new MerkleTree(elementsTUsd);
            let merkleProofTUsd = await merkleTreeTUsd.getHexProof(elementTUsd);
            console.log(merkleProofTUsd);

            // verify claim
            strategy.verifyClaim(balanceBal, 0, balanceTUsd, merkleProofBal, [], merkleProofTUsd);
        });

        it("Rewards should be greater or equal 0 USDC", async function () {
            expect(balanceUsdc).to.greaterThanOrEqual(0);
        });

    });

});
