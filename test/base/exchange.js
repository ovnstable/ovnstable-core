const {expect} = require("chai");
const chai = require("chai");
const {deployments, ethers, getNamedAccounts} = require('hardhat');
const {smock} = require("@defi-wonderland/smock");

const fs = require("fs");
const {toUSDC, fromE18, fromOvn, fromUSDC} = require("../../utils/decimals");
const hre = require("hardhat");
const BN = require('bignumber.js');
const {greatLess} = require("../../utils/tests");


let assets = JSON.parse(fs.readFileSync('./assets.json'));

chai.use(smock.matchers);

describe("Exchange", function () {

    let account;
    let exchange;
    let pm;
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
        pm = await ethers.getContract('PortfolioManager');
        m2m = await ethers.getContract('Mark2Market');
        usdc = await ethers.getContractAt("ERC20", assets.usdc);

    });


    describe("Mint 100 USD+ ", function () {

        let weights;
        let strategyAssets;
        let balanceUserUsdPlus;
        let balanceUserUSDC;
        let vaultBalance;

        before(async () => {
            const sum = toUSDC(100);

            balanceUserUSDC = fromUSDC(await usdc.balanceOf(account));

            await usdc.approve(exchange.address, sum);

            await (await exchange.buy(assets.usdc, sum)).wait();

            strategyAssets = await m2m.strategyAssets();

            vaultBalance = 0;
            for (let i = 0; i <strategyAssets.length ; i++) {
                vaultBalance += fromUSDC(strategyAssets[i].netAssetValue);
            }

            console.log('Vault balance ' + vaultBalance);

            weights = await pm.getAllStrategyWeights();
            balanceUserUsdPlus = fromOvn(await usdPlus.balanceOf(account));

            let totalSellAssets = await m2m.totalNetAssets();
            console.log("totalSellAssets " + totalSellAssets);
            let totalBuyAssets = await m2m.totalLiquidationAssets();
            console.log("totalBuyAssets " + totalBuyAssets);
        });

        it("balance USDC must be less than 100 ", async function () {
            expect(fromUSDC(await usdc.balanceOf(account))).to.eq(balanceUserUSDC-100)
        });

        it("Balance USD+ should 99.96", function () {
            expect(balanceUserUsdPlus.toString()).to.eq("99.96")
        });

        it("total vault balance (USDC) should greater than 99.96 (USDC)", function () {
            expect(vaultBalance).to.greaterThanOrEqual(99.96);
        });

        it("total vault balance (USDC) should less than 100.04 (USDC)", function () {
            expect(vaultBalance).to.lessThanOrEqual(100.04);
        });

        it("asset amounts match asset weights", function () {

            let totalValue = 100;
            for (let i = 0; i < weights.length; i++) {

                let weight = weights[i];
                let asset = findAssetPrice(weight.strategy, strategyAssets);

                let target = weight.targetWeight / 1000;
                let balance = fromUSDC(asset.netAssetValue)

                let targetValue = totalValue / 100 * target + "";
                let message = 'Balance ' + balance + " weight " + target + " asset " + weight.strategy +  " target value " + targetValue;
                console.log(message);

                expect(new BN(balance).toFixed(0)).to.eq(targetValue, message);
            }
        });

        describe("Redeem 50 USD+", function () {

            let weights;
            let strategyAssets;
            let balanceUserUsdPlus;
            let balanceUserUSDC;
            let totalBalance;

            before(async () => {
                balanceUserUSDC = fromUSDC(await usdc.balanceOf(account));
                await usdPlus.approve(exchange.address, toUSDC(50));
                let result = await exchange.redeem(usdc.address, toUSDC(50));
                await result.wait();

                strategyAssets = await m2m.strategyAssets();

                totalBalance = 0;
                for (let i = 0; i <strategyAssets.length ; i++) {
                    totalBalance += fromUSDC(strategyAssets[i].netAssetValue);
                }

                console.log('Vault balance ' + totalBalance);

                weights = await pm.getAllStrategyWeights();
                balanceUserUsdPlus = fromOvn(await usdPlus.balanceOf(account));

                let totalSellAssets = await m2m.totalNetAssets();
                console.log("totalSellAssets " + totalSellAssets);
                let totalBuyAssets = await m2m.totalLiquidationAssets();
                console.log("totalBuyAssets " + totalBuyAssets);
            });

            it("balance USDC must be more than 50", async function () {
                greatLess(fromUSDC(await usdc.balanceOf(account)), balanceUserUSDC+50);
            });

            it("Balance USD+ should 49.96", function () {
                expect(balanceUserUsdPlus.toString()).to.eq("49.96")
            });

            it("total vault balance (USDC) should be 50 (USDC)", function () {
                expect(new BN(totalBalance).toFixed(0)).to.eq("50");
            });

            it("total vault balance (USDC) should eq 50 (USDC)", function () {
                expect(new BN(totalBalance).toFixed(0)).to.eq("50");
            });

            it("asset amounts match asset weights", function () {
                let totalValue = 50;

                for (let i = 0; i < weights.length; i++) {

                    let weight = weights[i];
                    let asset = findAssetPrice(weight.strategy, strategyAssets);

                    let target = weight.targetWeight / 1000;
                    let balance = fromUSDC(asset.netAssetValue)

                    let targetValue = totalValue / 100 * target + "";
                    let message = 'Balance ' + balance + " weight " + target + " asset " + weight.strategy +  " target value " + targetValue;
                    console.log(message);

                    expect(new BN(balance).toFixed(0)).to.eq(targetValue, message);
                }
            });

        })

    });


});

function findAssetPrice(address, assets) {
    return assets.find(value => value.strategy === address);
}
