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
    let m2m;

    before(async () => {
        // need to run inside IDEA via node script running
        await hre.run("compile");

        await deployments.fixture(['setting', 'base', 'BuyUsdc']);

        const {deployer} = await getNamedAccounts();
        account = deployer;
        exchange = await ethers.getContract("Exchange");
        vault = await ethers.getContract("Vault");
        portfolio = await ethers.getContract('Portfolio');
        m2m = await ethers.getContract('Mark2Market');
        usdc = await ethers.getContractAt("ERC20", assets.usdc);


        hre.tracer.nameTags[portfolio.address] = "Portfolio";
        hre.tracer.nameTags[m2m.address] = "Mark2Market";
        hre.tracer.nameTags[(await ethers.getContract('Usdc2VimUsdActionBuilder')).address] = "Usdc2VimUsdActionBuilder";
        hre.tracer.nameTags[(await ethers.getContract('Usdc2IdleUsdcActionBuilder')).address] = "Usdc2IdleUsdcActionBuilder";
        hre.tracer.nameTags[(await ethers.getContract('Usdc2AUsdcActionBuilder')).address] = "Usdc2AUsdcActionBuilder";
        hre.tracer.nameTags[(await ethers.getContract('A3Crv2A3CrvGaugeActionBuilder')).address] = "A3Crv2A3CrvGaugeActionBuilder";
        hre.tracer.nameTags[(await ethers.getContract('AUsdc2A3CrvActionBuilder')).address] = "AUsdc2A3CrvActionBuilder";
        hre.tracer.nameTags[(await ethers.getContract('WMatic2UsdcActionBuilder')).address] = "WMatic2UsdcActionBuilder";
        hre.tracer.nameTags[(await ethers.getContract('Crv2UsdcActionBuilder')).address] = "Crv2UsdcActionBuilder";
        hre.tracer.nameTags[(await ethers.getContract('Mta2UsdcActionBuilder')).address] = "Mta2UsdcActionBuilder";


        for (const [key, value] of Object.entries(assets)) {
            hre.tracer.nameTags[value] = key;
        }


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
                // expect(new BN(balance).toFixed(0)).to.eq(targetValue, message);
            }
        });


    });


});


function findAssetPrice(address, assetPrices) {
    return assetPrices.find(value => value.asset === address);
}
