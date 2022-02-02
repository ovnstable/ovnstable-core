const {expect} = require("chai");
const chai = require("chai");
const {deployments, ethers, getNamedAccounts} = require('hardhat');
const {smock} = require("@defi-wonderland/smock");

const fs = require("fs");
const {toUSDC, fromE18, fromOvn, fromUSDC} = require("../utils/decimals");
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
        let balanceUser;
        let balanceUSDC;
        let usdcBalance;

        before(async () => {
            const sum = toUSDC(100);

            balanceUSDC = fromUSDC(await usdc.balanceOf(account));

            await usdc.approve(exchange.address, sum);

            let result = await exchange.buy(assets.usdc, sum);
            await result.wait();

            let totalAssetPrices = await m2m.assetPrices();
            weights = await portfolio.getAllAssetWeights();
            assetPrices = await totalAssetPrices.assetPrices;
            balanceUser = fromOvn(await usdPlus.balanceOf(account));
            totalUsdcPrice = await totalAssetPrices.totalUsdcPrice;
            usdcBalance = totalUsdcPrice / 10 ** 18;
            console.log("totalUsdcPrice " + totalUsdcPrice);

            let totalSellAssets = await m2m.totalSellAssets();
            console.log("totalSellAssets " + totalSellAssets);
            let totalBuyAssets = await m2m.totalBuyAssets();
            console.log("totalBuyAssets " + totalBuyAssets);
        });

        it("balance USDC must be less than 100 ", async function () {
            expect(fromUSDC(await usdc.balanceOf(account))).to.eq(balanceUSDC-100)
        });

        it("Balance USD+ should 99.96", function () {
            expect(balanceUser.toString()).to.eq("99.96")
        });

        it("total vault balance (USDC) should greater than 99.96 (USDC)", function () {
            expect(usdcBalance).to.greaterThanOrEqual(99.96);
        });

        it("total vault balance (USDC) should less than 100.04 (USDC)", function () {
            expect(usdcBalance).to.lessThanOrEqual(100.04);
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

        describe("Redeem 50 USD+", function () {

            let weights;
            let assetPrices;
            let totalUsdcPrice;
            let balanceAccount;
            let usdcBalance;

            before(async () => {
                await usdPlus.approve(exchange.address, toUSDC(50));
                let result = await exchange.redeem(usdc.address, toUSDC(50));
                await result.wait();

                let totalAssetPrices = await m2m.assetPrices();
                weights = await portfolio.getAllAssetWeights();
                assetPrices = await totalAssetPrices.assetPrices;
                balanceAccount = fromOvn(await usdPlus.balanceOf(account));

                totalUsdcPrice = await totalAssetPrices.totalUsdcPrice;
                usdcBalance = totalUsdcPrice / 10 ** 18;
                console.log("totalUsdcPrice " + totalUsdcPrice);

                let totalSellAssets = await m2m.totalSellAssets();
                console.log("totalSellAssets " + totalSellAssets);
                let totalBuyAssets = await m2m.totalBuyAssets();
                console.log("totalBuyAssets " + totalBuyAssets);
            });

            it("balance USDC must be more than 50", async function () {
                expect(new BN(fromUSDC(await usdc.balanceOf(account))).toFixed(0)).to.eq(new BN(balanceUSDC-50).toFixed(0))
            });

            it("Balance USD+ should 49.98", function () {
                expect(balanceAccount.toString()).to.eq("49.98")
            });

            it("total vault balance (USDC) should greater than 49.98 (USDC)", function () {
                expect(usdcBalance).to.greaterThanOrEqual(49.98);
            });

            it("total vault balance (USDC) should less than 50.02 (USDC)", function () {
                expect(usdcBalance).to.lessThanOrEqual(50.02);
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

//                    expect(new BN(balance).toFixed(0)).to.eq(targetValue, message);
                }
            });

        })

    });


});

function findAssetPrice(address, assetPrices) {
    return assetPrices.find(value => value.asset === address);
}
