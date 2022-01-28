const {expect} = require("chai");
const chai = require("chai");
const {deployments, ethers, getNamedAccounts} = require('hardhat');
const {FakeContract, smock} = require("@defi-wonderland/smock");

let decimals = require('../utils/decimals');

const fs = require("fs");
const {toUSDC, fromUSDC, fromVimUsd, fromAmUSDC, froAm3CRV, fromIdle} = require("../utils/decimals");
const hre = require("hardhat");
let assets = JSON.parse(fs.readFileSync('./assets.json'));

chai.use(smock.matchers);

describe("Rebalance", function () {

    let account;
    let exchange;
    let vault;
    let m2m;
    let portfolio;
    let connectorAAVE;
    let connectorCurve;
    let connectorIDLE;
    let connectorMStable;
    let usdc;
    let amUsdc;
    let am3CRV;
    let vimUsd;
    let idleUsdc;
    let usdPlus;

    beforeEach(async () => {
        // need to run inside IDEA via node script running
        await hre.run("compile");

        await deployments.fixture(['setting', 'base', 'BuyUsdc']);

        const {deployer} = await getNamedAccounts();
        account = deployer;
        exchange = await ethers.getContract("Exchange");
        vault = await ethers.getContract("Vault");
        m2m = await ethers.getContract('Mark2Market');
        portfolio = await ethers.getContract('Portfolio');
        connectorAAVE = await ethers.getContract("ConnectorAAVE");
        connectorCurve = await ethers.getContract("ConnectorCurve");
        connectorIDLE = await ethers.getContract("ConnectorIDLE");
        connectorMStable = await ethers.getContract("ConnectorMStable");
        usdPlus = await ethers.getContract("UsdPlusToken");
        usdc = await ethers.getContractAt("ERC20", assets.usdc);
        amUsdc = await ethers.getContractAt("ERC20", assets.amUsdc);
        am3CRV = await ethers.getContractAt("ERC20", assets.am3CRV);
        vimUsd = await ethers.getContractAt("ERC20", assets.vimUsd);
        idleUsdc = await ethers.getContractAt("ERC20", assets.idleUsdc);

        vault.setPortfolioManager(account);

        await connectorMStable.grantRole(await connectorMStable.PORTFOLIO_MANAGER(), account);
        await connectorMStable.grantRole(await connectorMStable.TOKEN_EXCHANGER(), account);
    });

    it("Staking IDLE and rebalancing", async function () {
        const sum = toUSDC(100);

        // 1 transaction
        await usdc.transfer(connectorIDLE.address, sum);
        let balance = await usdc.balanceOf(connectorIDLE.address);
        console.log('Balance usdc on connectorIDLE: ' + fromUSDC(balance));

        // stake
        await connectorIDLE.stake(usdc.address, sum, vault.address);
        balance = await idleUsdc.balanceOf(vault.address);
        console.log('Balance idleUsdc on vault: ' + fromIdle(balance));

        let totalAssetPrices = await m2m.assetPrices();
        let weights = await portfolio.getAllAssetWeights();
        let assetPrices = await totalAssetPrices.assetPrices;
        let totalUsdcPrice = await totalAssetPrices.totalUsdcPrice;
        console.log("totalUsdcPrice before: " + totalUsdcPrice);

        let totalValue = 100;
        for (let i = 0; i < weights.length; i++) {

            let weight = weights[i];
            let asset = findAssetPrice(weight.asset, assetPrices);

            let target = weight.targetWeight / 1000;
            let balance = (asset.amountInVault / asset.usdcPriceDenominator) * (asset.usdcSellPrice / asset.usdcPriceDenominator);

            let targetValue = totalValue / 100 * target + "";
            let message = 'Balance ' + balance + " weight " + target + " symbol " + asset.symbol + " target value " + targetValue;
            console.log(message);
        }

        let result = await exchange.buy(assets.usdc, 0);
        await result.wait();

        totalAssetPrices = await m2m.assetPrices();
        weights = await portfolio.getAllAssetWeights();
        assetPrices = await totalAssetPrices.assetPrices;
        totalUsdcPrice = await totalAssetPrices.totalUsdcPrice;
        console.log("totalUsdcPrice after: " + totalUsdcPrice);

        for (let i = 0; i < weights.length; i++) {

            let weight = weights[i];
            let asset = findAssetPrice(weight.asset, assetPrices);

            let target = weight.targetWeight / 1000;
            let balance = (asset.amountInVault / asset.usdcPriceDenominator) * (asset.usdcSellPrice / asset.usdcPriceDenominator);

            let targetValue = totalValue / 100 * target + "";
            let message = 'Balance ' + balance + " weight " + target + " symbol " + asset.symbol + " target value " + targetValue;
            console.log(message);

            let delta = Math.abs(balance - target) * 100;
            expect(delta).to.lessThanOrEqual(10, "Error");
        }
    });

    it("Staking MStable and rebalancing", async function () {
        const sum = toUSDC(100);

        // 1 transaction
        await usdc.transfer(connectorMStable.address, sum);
        let balance = await usdc.balanceOf(connectorMStable.address);
        console.log('Balance usdc on connectorMStable: ' + fromUSDC(balance));

        // stake
        await connectorMStable.stake(usdc.address, sum, vault.address);
        balance = await vimUsd.balanceOf(vault.address);
        console.log('Balance vimUsd on vault: ' + fromVimUsd(balance));

        let totalAssetPrices = await m2m.assetPrices();
        let weights = await portfolio.getAllAssetWeights();
        let assetPrices = await totalAssetPrices.assetPrices;
        let totalUsdcPrice = await totalAssetPrices.totalUsdcPrice;
        console.log("totalUsdcPrice before: " + totalUsdcPrice);

        let totalValue = 100;
        for (let i = 0; i < weights.length; i++) {

            let weight = weights[i];
            let asset = findAssetPrice(weight.asset, assetPrices);

            let target = weight.targetWeight / 1000;
            let balance = (asset.amountInVault / asset.usdcPriceDenominator) * (asset.usdcSellPrice / asset.usdcPriceDenominator);

            let targetValue = totalValue / 100 * target + "";
            let message = 'Balance ' + balance + " weight " + target + " symbol " + asset.symbol + " target value " + targetValue;
            console.log(message);
        }

        let result = await exchange.buy(assets.usdc, 0);
        await result.wait();

        totalAssetPrices = await m2m.assetPrices();
        weights = await portfolio.getAllAssetWeights();
        assetPrices = await totalAssetPrices.assetPrices;
        totalUsdcPrice = await totalAssetPrices.totalUsdcPrice;
        console.log("totalUsdcPrice after: " + totalUsdcPrice);

        for (let i = 0; i < weights.length; i++) {

            let weight = weights[i];
            let asset = findAssetPrice(weight.asset, assetPrices);

            let target = weight.targetWeight / 1000;
            let balance = (asset.amountInVault / asset.usdcPriceDenominator) * (asset.usdcSellPrice / asset.usdcPriceDenominator);

            let targetValue = totalValue / 100 * target + "";
            let message = 'Balance ' + balance + " weight " + target + " symbol " + asset.symbol + " target value " + targetValue;
            console.log(message);

            let delta = Math.abs(balance - target) * 100;
            expect(delta).to.lessThanOrEqual(10, "Error");
        }
    });

    /*
    it("Staking Curve and rebalancing", async function () {
        const sum = toUSDC(100);

        // 1 transaction
        await usdc.transfer(connectorAAVE.address, sum);
        let balance = await usdc.balanceOf(connectorAAVE.address);
        console.log('Balance usdc on connectorAave: ' + fromUSDC(balance));

        // stake USDC
        await connectorAAVE.stake(usdc.address, sum, vault.address);
        balance = await amUsdc.balanceOf(vault.address);
        console.log('Balance amUsdc on vault: ' + fromAmUSDC(balance))

        // 2 transaction
        await amUsdc.transfer(connectorCurve.address, balance);
        balance = await amUsdc.balanceOf(connectorCurve.address);
        console.log('Balance amUsdc on connectorCurve: ' + fromAmUSDC(balance));

        // stake amUSDC
        await connectorCurve.stake(amUsdc.address, balance, vault.address);
        balance = await am3CRV.balanceOf(vault.address);
        console.log('Balance am3CRV on vault: ' + froAm3CRV(balance));

        let totalAssetPrices = await m2m.assetPrices();
        let weights = await portfolio.getAllAssetWeights();
        let assetPrices = await totalAssetPrices.assetPrices;
        let totalUsdcPrice = await totalAssetPrices.totalUsdcPrice;
        console.log("totalUsdcPrice before: " + totalUsdcPrice);

        let totalValue = 100;
        for (let i = 0; i < weights.length; i++) {

            let weight = weights[i];
            let asset = findAssetPrice(weight.asset, assetPrices);

            let target = weight.targetWeight / 1000;
            let balance = (asset.amountInVault / asset.usdcPriceDenominator) * (asset.usdcSellPrice / asset.usdcPriceDenominator);

            let targetValue = totalValue / 100 * target + "";
            let message = 'Balance ' + balance + " weight " + target + " symbol " + asset.symbol + " target value " + targetValue;
            console.log(message);
        }

        let result = await exchange.buy(assets.usdc, 0);
        await result.wait();

        totalAssetPrices = await m2m.assetPrices();
        weights = await portfolio.getAllAssetWeights();
        assetPrices = await totalAssetPrices.assetPrices;
        totalUsdcPrice = await totalAssetPrices.totalUsdcPrice;
        console.log("totalUsdcPrice after: " + totalUsdcPrice);

        for (let i = 0; i < weights.length; i++) {

            let weight = weights[i];
            let asset = findAssetPrice(weight.asset, assetPrices);

            let target = weight.targetWeight / 1000;
            let balance = (asset.amountInVault / asset.usdcPriceDenominator) * (asset.usdcSellPrice / asset.usdcPriceDenominator);

            let targetValue = totalValue / 100 * target + "";
            let message = 'Balance ' + balance + " weight " + target + " symbol " + asset.symbol + " target value " + targetValue;
            console.log(message);

            let delta = Math.abs(balance - target) * 100;
            expect(delta).to.lessThanOrEqual(10, "Error");
        }
    }); */

});

function findAssetPrice(address, assetPrices) {
    return assetPrices.find(value => value.asset === address);
}
