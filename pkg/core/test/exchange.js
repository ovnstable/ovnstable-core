const {expect} = require("chai");
const {deployments, ethers, getNamedAccounts} = require('hardhat');
const {toE6, fromE6, toE18, fromE18} = require("@overnight-contracts/common/utils/decimals");
const hre = require("hardhat");
const BigNumber = require('bignumber.js');
const {greatLess, resetHardhat} = require("@overnight-contracts/common/utils/tests");
const expectRevert = require("@overnight-contracts/common/utils/expectRevert");
const {evmCheckpoint, evmRestore, sharedBeforeEach} = require("@overnight-contracts/common/utils/sharedBeforeEach")
let {DEFAULT} = require('@overnight-contracts/common/utils/assets');
const chai = require("chai");
chai.use(require('chai-bignumber')());
const {ZERO_ADDRESS} = require("@openzeppelin/test-helpers/src/constants");
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
    let rewardWallet;

    let asset;
    let toAsset = function() {};
    let fromAsset = function() {};


    sharedBeforeEach("deploy contracts", async () => {
        // need to run inside IDEA via node script running
        await hre.run("compile");
        await resetHardhat(process.env.STAND);

        const [mockDeployer] = provider.getWallets();

        rewardWallet = provider.createEmptyWallet();
        let payoutListener = await deployMockContract(mockDeployer, await getAbi('IPayoutListener'));
        await payoutListener.mock.payoutDone.returns();

        await deployments.fixture(['setting', 'base', 'test', 'MockStrategies', 'ExchangeMultiCallWrapper']);

        const {deployer} = await getNamedAccounts();
        account = deployer;
        exchange = await ethers.getContract("Exchange");

        await exchange.setPayoutListener(payoutListener.address);
        await exchange.setInsurance(rewardWallet.address);

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

        it("Delta abroad:max -> mint USD+ to insurance wallet", async function () {
            await asset.transfer(pm.address, toAsset(4));
            await exchange.payout();
            expect(500000).to.equal(await usdPlus.balanceOf(rewardWallet.address));
        });

        it("Expect revert: Delta abroad:min", async function () {
            await expectRevert(exchange.payout(), "Delta abroad:min");
        });

        it("Within abroad", async function () {
            await asset.transfer(pm.address, toAsset(2));
            await exchange.payout();
        });


    });

    describe('Payout: Abroad:max', function (){

        sharedBeforeEach("Payout: Abroad", async () => {
            const sum = toAsset(1000000);

            await usdPlus.setExchanger(account);
            await usdPlus.setLiquidityIndex('1000000000000000000000000000');
            await usdPlus.setExchanger(exchange.address);

            await asset.approve(exchange.address, sum);

            await exchange.setBuyFee(0, 100000);

            await (await exchange.buy(asset.address, sum)).wait();
        });

        it("Delta > abroad:max -> mint USD+ to insurance wallet", async function () {
            await asset.transfer(pm.address, toAsset(360));
            let receipt = await (await exchange.payout()).wait();
            const payoutEvent = receipt.events.find((e) => e.event === 'PayoutEvent');
            expect(new BigNumber(payoutEvent.args[4].toString()).gte(new BigNumber(toAsset(350)))).to.equal(true);
            expect(toAsset(1000350)).to.equal(await usdPlus.balanceOf(account));
            expect(toAsset(10)).to.equal(await usdPlus.balanceOf(rewardWallet.address));
        });

        it("Delta = abroad:max -> mint USD+ to insurance wallet", async function () {
            await asset.transfer(pm.address, toAsset(350));
            let receipt = await (await exchange.payout()).wait();
            const payoutEvent = receipt.events.find((e) => e.event === 'PayoutEvent');
            expect(payoutEvent.args[4].toString()).to.equal(toAsset(350).toString());
            expect(toAsset(1000350)).to.equal(await usdPlus.balanceOf(account));
            expect("0").to.equal(await usdPlus.balanceOf(rewardWallet.address));
        });

        it("Delta < abroad:max -> don't mint USD+ to insurance wallet", async function () {
            await asset.transfer(pm.address, toAsset(340));
            let receipt = await (await exchange.payout()).wait();
            const payoutEvent = receipt.events.find((e) => e.event === 'PayoutEvent');
            expect(payoutEvent.args[4].toString()).to.equal(toAsset(340).toString());
            expect(toAsset(1000340)).to.equal(await usdPlus.balanceOf(account));
            expect("0").to.equal(await usdPlus.balanceOf(rewardWallet.address));
        });

    });

    describe('FreeRider: Buy/Redeem', function (){

        sharedBeforeEach("FreeRider", async () => {
            await usdPlus.setExchanger(exchange.address);
            await exchange.setBuyFee(10000, 100000);  // 10%
            await exchange.setRedeemFee(10000, 100000); // 10%
        });

        it("Buy revert", async function () {
            let sumAsset = toAsset(0);
            await asset.approve(exchange.address, sumAsset);
            await expectRevert(exchange.buy(asset.address, sumAsset), "Amount of asset is zero");

            if (process.env.STAND === 'bsc') {
                let sumAsset = '10000000000';
                await asset.approve(exchange.address, sumAsset);
                await expectRevert(exchange.buy(asset.address, sumAsset), "Amount of USD+ is zero");
            }
        });

        it("Redeem revert", async function () {
            let sumAsset = toAsset(100);
            await asset.approve(exchange.address, sumAsset);
            await (await exchange.buy(asset.address, sumAsset)).wait();

            let sumUsdPlus = toE6(0);
            await usdPlus.approve(exchange.address, sumUsdPlus);
            await expectRevert(exchange.redeem(asset.address, sumUsdPlus), "Amount of USD+ is zero");
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
            let sumUsdPlus = toE6(5);
            await usdPlus.approve(exchange.address, sumUsdPlus);
            await exchange.redeem(asset.address, sumUsdPlus);
            let balanceAfter = new BigNumber(fromAsset((await asset.balanceOf(account)).toString()));

            expect(5).to.equal(balanceAfter.minus(balanceBefore).toNumber());

        });


    });


    describe("Mint 100 USD+ ", function () {

        let weights;
        let strategyAssets;
        let balanceUserUsdPlus;
        let balanceUserAsset;
        let vaultBalance;
        let referralCode = "test";
        let transaction;


        sharedBeforeEach("buy usd+", async () => {
            const sum = toAsset(100);

            balanceUserAsset = new BigNumber(fromAsset((await asset.balanceOf(account)).toString()));

            await asset.approve(exchange.address, sum);

            let mintParams = {
                asset: asset.address,
                amount: sum,
                referral: referralCode
            }

            transaction = await (await exchange.mint(mintParams)).wait();
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

        it("EventExchange is correct", function () {
            let event = transaction.events.find((e) => e.event === 'EventExchange');
            expect(referralCode).to.eq(event.args.referral)
            expect("mint").to.eq(event.args.label)
            expect("40000").to.eq(event.args.fee.toString())
            expect("99960000").to.eq(event.args.amount.toString())
            expect(account).to.eq(event.args.sender)
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

                cashStrategy = await pm.cashStrategy();
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

        it("buy into redeem should fail", async function () {
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

        it("two buys should pass with FREE_RIDER_ROLE", async function () {
            await exchange.grantRole(await exchange.FREE_RIDER_ROLE(), multiCallWrapper.address);
            await multiCallWrapper.buy2(asset.address, usdPlus.address, toAsset(1), toAsset(1));
        });

        it("buy into redeem should pass with FREE_RIDER_ROLE", async function () {
            await exchange.grantRole(await exchange.FREE_RIDER_ROLE(), multiCallWrapper.address);
            await multiCallWrapper.buyRedeem(asset.address, usdPlus.address, toAsset(1), toAsset(1));
        });

        it("two redeems should pass with FREE_RIDER_ROLE", async function () {
            await exchange.grantRole(await exchange.FREE_RIDER_ROLE(), multiCallWrapper.address);
            await multiCallWrapper.redeem2(asset.address, usdPlus.address, toAsset(1), toAsset(1));
        });

        it("redeem into buy should pass with FREE_RIDER_ROLE", async function () {
            await exchange.grantRole(await exchange.FREE_RIDER_ROLE(), multiCallWrapper.address);
            await multiCallWrapper.redeemBuy(asset.address, usdPlus.address, toAsset(1), toAsset(1));
        });
    });

    describe("Payout", function () {

        let mockPL;

        sharedBeforeEach('deploy', async () => {
            await deployments.fixture(['MockPayoutListener']);
            mockPL = await ethers.getContract("MockPayoutListener");

            await exchange.setBuyFee(25, 100000);
        });


        it("Mint, Payout should increase liq index", async function () {

            // unset PL if was set on deploy stage
            await (await exchange.setPayoutListener(ZERO_ADDRESS)).wait();

            const sum = toAsset(100000);
            await (await asset.approve(exchange.address, sum)).wait();
            await (await exchange.buy(asset.address, sum)).wait();

            let totalNetAssets = new BigNumber(fromAsset((await m2m.totalNetAssets()).toString()));
            let totalLiqAssets = new BigNumber(fromAsset((await m2m.totalLiquidationAssets()).toString()));
            let liquidationIndex = await usdPlus.liquidityIndex();
            let balanceUsdPlusUser = fromE6(await usdPlus.balanceOf(account));

            // wait 1 days
            const days = 1 * 24 * 60 * 60;
            await ethers.provider.send("evm_increaseTime", [days])
            await ethers.provider.send('evm_mine');

            let receipt = await (await exchange.payout()).wait();
            console.log(`Payout: gas used: ${receipt.gasUsed}`);

            let totalNetAssetsNew = new BigNumber(fromAsset((await m2m.totalNetAssets()).toString()));
            let totalLiqAssetsNew = new BigNumber(fromAsset((await m2m.totalLiquidationAssets()).toString()));
            let liquidationIndexNew = await usdPlus.liquidityIndex();
            let balanceUsdPlusUserNew = fromE6(await usdPlus.balanceOf(account));

            console.log(`Total net assets ${totalNetAssets.toFixed()}->${totalNetAssetsNew.toFixed()}`);
            console.log(`Total liq assets ${totalLiqAssets.toFixed()}->${totalLiqAssetsNew.toFixed()}`);
            console.log(`Liq index ${liquidationIndex}->${liquidationIndexNew}`);
            console.log(`Balance usd+ ${balanceUsdPlusUser}->${balanceUsdPlusUserNew}`);

            expect(liquidationIndexNew.toString()).to.not.eq(liquidationIndex.toString());
            expect(totalNetAssetsNew.gte(totalNetAssets)).to.equal(true);
            expect(totalLiqAssetsNew.gte(totalLiqAssets)).to.equal(true);
            expect(balanceUsdPlusUserNew).to.greaterThan(balanceUsdPlusUser);
        });

        it("Call payout with PayoutListener", async function () {

            // unset PL if was set on deploy stage
            await (await exchange.setPayoutListener(ZERO_ADDRESS)).wait();

            const sum = toAsset(100000);
            await (await asset.approve(exchange.address, sum)).wait();
            await (await exchange.buy(asset.address, sum)).wait();

            // wait 1 days
            const days = 1 * 24 * 60 * 60;
            await ethers.provider.send("evm_increaseTime", [days])
            await ethers.provider.send('evm_mine');

            // when not set mock PL payout should pass ok
            evmCheckpoint('before_payout');
            let payoutReceipt = await (await exchange.payout()).wait();
            const payoutEvent = payoutReceipt.events.find((e) => e.event === 'PayoutEvent');
            expect(payoutEvent).to.not.be.undefined;
            evmRestore('before_payout');

            let receipt = await (await exchange.setPayoutListener(mockPL.address)).wait();
            const updatedEvent = receipt.events.find((e) => e.event === 'PayoutListenerUpdated');
            expect(updatedEvent.args[0]).to.equals(mockPL.address);

            await expectRevert(mockPL.payoutDone(), 'MockPayoutListener.payoutDone() called');
            await expectRevert(exchange.payout(), 'MockPayoutListener.payoutDone() called');
        });

    });

});

function findAssetPrice(address, assets) {
    return assets.find(value => value.strategy === address);
}
