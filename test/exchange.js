const {expect} = require("chai");
const chai = require("chai");
const {deployments, ethers, getNamedAccounts} = require('hardhat');
const {smock} = require("@defi-wonderland/smock");

const fs = require("fs");
const {toUSDC, fromE18} = require("../utils/decimals");
const hre = require("hardhat");
const BN = require('bignumber.js');


let assets = JSON.parse(fs.readFileSync('./assets.json'));

chai.use(smock.matchers);

describe("Exchange", function () {

    let account;
    let exchange;
    let vault;
    let portfolio;
    let usdc;
    let usdPlus;
    let m2m;

    before(async () => {
        // need to run inside IDEA via node script running
        await hre.run("compile");

        await deployments.fixture(['setting', 'base', 'BuyUsdc']);

        const {deployer} = await getNamedAccounts();
        account = deployer;
        exchange = await ethers.getContract("Exchange");
        usdPlus = await ethers.getContract("UsdPlusToken");
        vault = await ethers.getContract("Vault");
        portfolio = await ethers.getContract('Portfolio');
        m2m = await ethers.getContract('Mark2Market');
        usdc = await ethers.getContractAt("ERC20", assets.usdc);

    });


    describe("Mint 100 USD+ ", function () {

        let weights;
        let assetPrices;
        let totalUsdcPrice;

        before(async () => {
            const sum = toUSDC(100);
            await usdc.approve(exchange.address, sum);

            let result = await exchange.buy(assets.usdc, sum);
            await result.wait();

            let totalAssetPrices = await m2m.assetPrices();
            weights = await portfolio.getAllAssetWeights();
            assetPrices = await totalAssetPrices.assetPrices;
            totalUsdcPrice = await totalAssetPrices.totalUsdcPrice;


        });


        it("total vault balance (USDC) should equal 99.97 (USDC)", function () {
            console.log("totalUsdcPrice " + totalUsdcPrice);

            expect(new BN(fromE18(totalUsdcPrice)).toFixed(2)).to.eq("99.97")
        });

        it("asset amounts match asset weights", function () {

            let totalValue = 100;
            for (let i = 0; i < weights.length; i++) {

                let weight = weights[i];
                let asset = findAssetPrice(weight.asset, assetPrices);

                let target = weight.targetWeight / 1000;
                let balance = (asset.amountInVault / asset.usdcPriceDenominator) * (asset.usdcSellPrice / asset.usdcPriceDenominator);

                let targetValue = totalValue / 100 * target + "";
                let message = 'Balance ' + balance + " weight " + target + " asset " + weight.asset + " symbol " + asset.symbol + " target value " + targetValue;
                console.log(message);

                expect(new BN(balance).toFixed(0)).to.eq(targetValue, message);
            }
        });


    });

    describe("Mint 100 USD+ => Redeem 50 USD+", function () {

        let weights;
        let assetPrices;
        let totalUsdcPrice;

        before(async () => {
            const sum = toUSDC(100);
            await usdc.approve(exchange.address, sum);

            let result = await exchange.buy(assets.usdc, sum);
            await result.wait();

            await usdPlus.approve(exchange.address, toUSDC(50));
            result = await exchange.redeem(usdc.address, toUSDC(50));
            await result.wait();

            let totalAssetPrices = await m2m.assetPrices();
            weights = await portfolio.getAllAssetWeights();
            assetPrices = await totalAssetPrices.assetPrices;
            totalUsdcPrice = await totalAssetPrices.totalUsdcPrice;


        });


        it("total vault balance (USDC) should equal 49.97 (USDC)", function () {
            console.log("totalUsdcPrice " + totalUsdcPrice);

            expect(new BN(fromE18(totalUsdcPrice)).toFixed(2)).to.eq("49.97")
        });

        it("asset amounts match asset weights", function () {

            let totalValue = 50;
            for (let i = 0; i < weights.length; i++) {

                let weight = weights[i];
                let asset = findAssetPrice(weight.asset, assetPrices);

                let target = weight.targetWeight / 1000;
                let balance = (asset.amountInVault / asset.usdcPriceDenominator) * (asset.usdcSellPrice / asset.usdcPriceDenominator);

                let targetValue = totalValue / 100 * target + "";
                let message = 'Balance ' + balance + " weight " + target + " asset " + weight.asset + " symbol " + asset.symbol + " target value " + targetValue;
                console.log(message);

                expect(new BN(balance).toFixed(0)).to.eq(targetValue, message);
            }
        });


    });

});


function findAssetPrice(address, assetPrices) {
    return assetPrices.find(value => value.asset === address);
}
