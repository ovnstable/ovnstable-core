const {expect} = require("chai");
const {deployments, ethers, getNamedAccounts} = require('hardhat');
const {toE6, fromE6, toE18, fromE18} = require("@overnight-contracts/common/utils/decimals");
const hre = require("hardhat");
const BigNumber = require('bignumber.js');
const {greatLess, resetHardhat} = require("@overnight-contracts/common/utils/tests");
const expectRevert = require("@overnight-contracts/common/utils/expectRevert");
const {sharedBeforeEach} = require("@overnight-contracts/common/utils/sharedBeforeEach")
let {DEFAULT} = require('@overnight-contracts/common/utils/assets');
const chai = require("chai");
chai.use(require('chai-bignumber')());

const {waffle} = require("hardhat");
const {getAbi} = require("@overnight-contracts/common/utils/script-utils");
const {deployMockContract, provider} = waffle;


describe("Exchange", function () {

    let account;
    let exchange;
    let pm;
    let usdPlus;
    let m2m;
    let multiCallWrapper;

    let asset;
    let toAsset = function() {};
    let fromAsset = function() {};


    sharedBeforeEach("deploy contracts", async () => {
        // need to run inside IDEA via node script running
        await hre.run("compile");
        await resetHardhat(process.env.STAND);

        const [mockDeployer] = provider.getWallets();
        let payoutListener = await deployMockContract(mockDeployer, await getAbi('IPayoutListener'));
        await payoutListener.mock.payoutDone.returns();

        await deployments.fixture(['setting', 'base', 'test', 'MockStrategies', 'ExchangeMultiCallWrapper']);

        const {deployer} = await getNamedAccounts();
        account = deployer;
        exchange = await ethers.getContract("Exchange");

        await exchange.setPayoutListener(payoutListener.address);

        usdPlus = await ethers.getContract("UsdPlusToken");
        pm = await ethers.getContract('PortfolioManager');
        m2m = await ethers.getContract('Mark2Market');
        multiCallWrapper = await ethers.getContract('ExchangeMultiCallWrapper');

        if (process.env.STAND === 'bsc') {
            asset = await ethers.getContractAt("ERC20", DEFAULT.busd);
            toAsset = toE18;
            fromAsset = fromE18;
        } else {
            asset = await ethers.getContractAt("ERC20", DEFAULT.usdc);
            toAsset = toE6;
            fromAsset = fromE6;
        }
    });


    describe('Payout: Abroad', function (){

        sharedBeforeEach("Payout: Abroad", async () => {
            const sum = toAsset(10000);

            await usdPlus.setExchanger(account);
            await usdPlus.setLiquidityIndex('1044705455364278981063959942');
            await usdPlus.setExchanger(exchange.address);

            await asset.approve(exchange.address, sum);

            await exchange.setBuyFee(0, 100000);

            await (await exchange.buy(asset.address, sum)).wait();

        });

        it("Expect revert: Delta abroad:max ", async function () {
            await asset.transfer(pm.address, toAsset(4));
            await expectRevert(exchange.payout(), "Delta abroad:max");
        });

        it("Expect revert: Delta abroad:min", async function () {
            await expectRevert(exchange.payout(), "Delta abroad:min");
        });

        it("Within abroad", async function () {
            await asset.transfer(pm.address, toAsset(2));
            await exchange.payout();
        });


    });

    describe('FreeRider: Buy/Redeem', function (){

        sharedBeforeEach("FreeRider", async () => {
            await usdPlus.setExchanger(exchange.address);
            await exchange.setBuyFee(10000, 100000);  // 10%
            await exchange.setRedeemFee(10000, 100000); // 10%
        });

        it("[Simple] User [buy/redeem] USD+ and pay fee", async function () {
            let sumAsset = toAsset(100);
            await asset.approve(exchange.address, sumAsset);
            await (await exchange.buy(asset.address, sumAsset)).wait();

            let balanceUsdPlus = await usdPlus.balanceOf(account);
            expect(90).to.equal(fromE6(balanceUsdPlus));

            let balanceBefore = new BigNumber(fromAsset((await asset.balanceOf(account)).toString()));
            let sumUsdPlus = toE6(10);
            await usdPlus.approve(exchange.address, sumUsdPlus);
            await exchange.redeem(asset.address, sumUsdPlus);
            let balanceAfter = new BigNumber(fromAsset((await asset.balanceOf(account)).toString()));
            let assetBalance = await asset.balanceOf(account);

            expect(9).to.equal(balanceAfter.minus(balanceBefore).toNumber());
        });

        it("[Free Rider] User [buy/redeem] USD+ and NOT pay fee", async function () {
            let sumAsset = toAsset(10);
            await asset.approve(exchange.address, sumAsset);

            await exchange.grantRole(await exchange.FREE_RIDER_ROLE(), account);
            await exchange.buy(asset.address, sumAsset);
            expect(10).to.equal(fromE6(await usdPlus.balanceOf(account)));


            let balanceBefore = new BigNumber(fromAsset((await asset.balanceOf(account)).toString()));
            let sumUsdPlus = toE6(10);
            await usdPlus.approve(exchange.address, sumUsdPlus);
            await exchange.redeem(asset.address, sumUsdPlus);
            let balanceAfter = new BigNumber(fromAsset((await asset.balanceOf(account)).toString()));

            expect(10).to.equal(balanceAfter.minus(balanceBefore).toNumber());

        });


    });


    describe("Mint 100 USD+ ", function () {

        let weights;
        let strategyAssets;
        let balanceUserUsdPlus;
        let balanceUserAsset;
        let vaultBalance;

        sharedBeforeEach("buy usd+", async () => {
            const sum = toAsset(100);

            balanceUserAsset = new BigNumber(fromAsset((await asset.balanceOf(account)).toString()));

            await asset.approve(exchange.address, sum);

            await (await exchange.buy(asset.address, sum)).wait();

            strategyAssets = await m2m.strategyAssets();

            vaultBalance = new BigNumber(0);
            for (let i = 0; i < strategyAssets.length; i++) {
                vaultBalance = vaultBalance.plus(new BigNumber(fromAsset(strategyAssets[i].netAssetValue.toString())));
            }

            console.log('Vault balance ' + vaultBalance);

            weights = await pm.getAllStrategyWeights();
            balanceUserUsdPlus = fromE6(await usdPlus.balanceOf(account));

            let totalSellAssets = await m2m.totalNetAssets();
            console.log("totalSellAssets " + totalSellAssets);
            let totalBuyAssets = await m2m.totalLiquidationAssets();
            console.log("totalBuyAssets " + totalBuyAssets);
        });

        it("balance asset must be less than 100 ", async function () {
            expect(new BigNumber(fromAsset((await asset.balanceOf(account)).toString())).toNumber()).to.eq(balanceUserAsset - 100)
        });

        it("Balance USD+ should 99.96", function () {
            expect(balanceUserUsdPlus.toString()).to.eq("99.96")
        });

        it("total vault balance (asset) should greater than 99.96 (asset)", function () {
            expect(vaultBalance.toNumber()).to.greaterThanOrEqual(99.96);
        });

        it("total vault balance (asset) should less than 100.04 (asset)", function () {
            expect(vaultBalance.toNumber()).to.lessThanOrEqual(100.04);
        });

        it("asset amounts match asset weights", function () {

            let totalValue = 100;
            for (let i = 0; i < weights.length; i++) {

                let weight = weights[i];
                let asset = findAssetPrice(weight.strategy, strategyAssets);

                let target = weight.targetWeight / 1000;
                let balance = new BigNumber(fromAsset(asset.netAssetValue.toString()));

                let targetValue = new BigNumber(totalValue / 100 * target);
                let message = 'Balance ' + balance.toFixed() + " weight " + target + " asset " + weight.strategy + " target value " + targetValue;
                console.log(message);

                greatLess(balance, targetValue, new BigNumber(1));
            }
        });

        describe("Redeem 50 USD+", function () {

            let weights;
            let strategyAssets;
            let balanceUserUsdPlus;
            let balanceUserAsset;
            let totalBalance;
            let cashStrategy;

            sharedBeforeEach("redeem usd+", async () => {
                balanceUserAsset = new BigNumber(fromAsset((await asset.balanceOf(account)).toString()));

                let sumUsdPlus = toE6(50);
                await usdPlus.approve(exchange.address, sumUsdPlus);
                let result = await exchange.redeem(asset.address, sumUsdPlus);
                await result.wait();

                strategyAssets = await m2m.strategyAssets();

                totalBalance = new BigNumber(0);
                for (let i = 0; i < strategyAssets.length; i++) {
                    totalBalance = totalBalance.plus(new BigNumber(fromAsset(strategyAssets[i].netAssetValue.toString())));
                }

                console.log('Vault balance ' + totalBalance.toFixed());

                weights = await pm.getAllStrategyWeights();
                balanceUserUsdPlus = fromE6(await usdPlus.balanceOf(account));

                let totalSellAssets = await m2m.totalNetAssets();
                console.log("totalSellAssets " + totalSellAssets);
                let totalBuyAssets = await m2m.totalLiquidationAssets();
                console.log("totalBuyAssets " + totalBuyAssets);

                cashStrategy = await pm.getCashStrategy();
            });

            it("balance asset must be more than 50", async function () {
                greatLess(new BigNumber(fromAsset((await asset.balanceOf(account)).toString())), balanceUserAsset.plus(50), new BigNumber(1));
            });

            it("Balance USD+ should 49.96", function () {
                expect(balanceUserUsdPlus.toString()).to.eq("49.96")
            });

            it("total vault balance (asset) should be 50 (asset)", function () {
                expect(totalBalance.toFixed(0)).to.eq("50");
            });

            it("total vault balance (asset) should eq 50 (asset)", function () {
                expect(totalBalance.toFixed(0)).to.eq("50");
            });

            it("asset amounts match asset weights", function () {
                let totalValue = 50;

                for (let i = 0; i < weights.length; i++) {

                    let weight = weights[i];
                    let asset = findAssetPrice(weight.strategy, strategyAssets);

                    let target = weight.targetWeight / 1000;
                    let balance = new BigNumber(fromAsset(asset.netAssetValue.toString()));

                    let targetValue = new BigNumber(totalValue / 100 * target);
                    let message = 'Balance ' + balance.toFixed() + " weight " + target + " asset " + weight.strategy + " target value " + targetValue;
                    console.log(message);

                    if (cashStrategy === weight.strategy) {
                        expect(balance.gte(0)).to.equal(true);
                        expect(balance.lte(targetValue)).to.equal(true);
                    } else {
                        let totalWeightWithoutCashStrategy = 0;
                        for (let j = 0; j < weights.length; j++) {
                            if (cashStrategy !== weights[j].strategy) {
                                totalWeightWithoutCashStrategy += weights[j].targetWeight / 1000;
                            }
                        }
                        let maxValue = new BigNumber(totalValue * target / totalWeightWithoutCashStrategy);
                        expect(balance.gte(targetValue)).to.equal(true);
                        expect(balance.lte(maxValue)).to.equal(true);
                    }
                }
            });

        })

    });

    describe("Multi call", function () {

        sharedBeforeEach("buy usd+", async () => {
            const sum = toAsset(100);

            // buy 100 usd+
            await asset.approve(exchange.address, sum);
            await (await exchange.buy(asset.address, sum)).wait();

            // transfer 100 usd+ and 100 asset to multicall tester
            await asset.transfer(multiCallWrapper.address, sum);
            await usdPlus.transfer(multiCallWrapper.address, (await usdPlus.balanceOf(account)).toString());
        });

        it("two buys should fail", async function () {
            await expectRevert(
                multiCallWrapper.buy2(asset.address, usdPlus.address, toAsset(1), toAsset(1)),
                "Only once in block"
            );
        });

        it("buy into redeem fail", async function () {
            await expectRevert(
                multiCallWrapper.buyRedeem(asset.address, usdPlus.address, toAsset(1), toE6(1)),
                "Only once in block"
            );
        });

        it("two redeems should fail", async function () {
            await expectRevert(
                multiCallWrapper.redeem2(asset.address, usdPlus.address, toE6(1), toE6(1)),
                "Only once in block"
            );
        });

        it("redeem into buy should fail", async function () {
            await expectRevert(
                multiCallWrapper.redeemBuy(asset.address, usdPlus.address, toE6(1), toAsset(1)),
                "Only once in block"
            );
        });

    });

});

function findAssetPrice(address, assets) {
    return assets.find(value => value.strategy === address);
}
