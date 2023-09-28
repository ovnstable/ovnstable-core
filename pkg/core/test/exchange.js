const {expect} = require("chai");
const {deployments, ethers, getNamedAccounts} = require('hardhat');
const {toE6, fromE6, toE18, fromE18} = require("@overnight-contracts/common/utils/decimals");
const hre = require("hardhat");
const {resetHardhat, createRandomWallet} = require("@overnight-contracts/common/utils/tests");
const expectRevert = require("@overnight-contracts/common/utils/expectRevert");
const {sharedBeforeEach} = require("@overnight-contracts/common/utils/sharedBeforeEach")
const chai = require("chai");
chai.use(require('chai-bignumber')());
describe("Exchange", function () {

    let account;
    let exchange;
    let pm;
    let usdPlus;
    let insurance;
    let testAccount;
    let asset;

    let multiCallWrapper;

    let UNIT_ROLE;
    let FREE_RIDER_ROLE;
    let PORTFOLIO_AGENT_ROLE;

    let toAsset = function () {
    };
    let fromAsset = function () {
    };

    let fromRebase = function () {

    };
    let toRebase = function () {

    };

    let decimals = [
        {
            asset: 6,
            rebase: 6
        },
        {
            asset: 18,
            rebase: 6
        },
        {
            asset: 18,
            rebase: 18
        }
    ];


    decimals.forEach((decimal, index) => {

        describe(`Decimal: asset [${decimal.asset}] rebase [${decimal.rebase}]`, async function () {

            sharedBeforeEach("deploy contracts", async () => {
                // need to run inside IDEA via node script running
                await hre.run("compile");
                await resetHardhat(process.env.STAND);

                await deployments.fixture(['TestExchange', 'ExchangeMultiCallWrapper']);

                const {deployer} = await getNamedAccounts();
                account = deployer;
                testAccount = await createRandomWallet();

                exchange = await ethers.getContract("Exchange");
                await exchange.grantRole(await exchange.PORTFOLIO_AGENT_ROLE(), account);

                usdPlus = await ethers.getContract("UsdPlusToken");
                pm = await ethers.getContract('MockPortfolioManager');
                insurance = await ethers.getContract('MockInsuranceExchange');
                asset = await ethers.getContract('AssetToken');

                multiCallWrapper = await ethers.getContract('ExchangeMultiCallWrapper');

                if (decimal.rebase === 6) {
                    toRebase = toE6;
                    fromRebase = fromE6;
                } else {
                    toRebase = toE18;
                    fromRebase = fromE18;
                }

                if (decimal.asset === 6) {
                    toAsset = toE6;
                    fromAsset = fromE6;
                } else {
                    toAsset = toE18;
                    fromAsset = fromE18;
                }

                await asset.setDecimals(decimal.asset);
                await usdPlus.setDecimals(decimal.rebase);

                UNIT_ROLE = await exchange.UNIT_ROLE();
                FREE_RIDER_ROLE = await exchange.FREE_RIDER_ROLE();
                PORTFOLIO_AGENT_ROLE = await exchange.PORTFOLIO_AGENT_ROLE();

            });


            describe("PortfolioManager: role", function () {

                sharedBeforeEach("PortfolioManager: role", async () => {
                    await exchange.grantRole(await exchange.PORTFOLIO_AGENT_ROLE(), account);

                });

                it("grantRole: UNIT_ROLE [success]", async function () {
                    await exchange.grantRole(UNIT_ROLE, testAccount.address);
                    expect(await exchange.hasRole(UNIT_ROLE, testAccount.address)).to.be.true;
                });

                it("grantRole: UNIT_ROLE [revert]", async function () {
                    let error = false;
                    try {
                        await exchange.connect(testAccount).grantRole(UNIT_ROLE, testAccount.address)
                    } catch (e) {
                        error = true;
                    }
                    expect(error).to.be.true;
                });


                it("grantRole: FREE_RIDER_ROLE [success]", async function () {
                    await exchange.grantRole(FREE_RIDER_ROLE, testAccount.address);
                    expect(await exchange.hasRole(FREE_RIDER_ROLE, testAccount.address)).to.be.true;
                });

                it("grantRole: FREE_RIDER_ROLE [revert]", async function () {
                    let error = false;
                    try {
                        await exchange.connect(testAccount).grantRole(FREE_RIDER_ROLE, testAccount.address)
                    } catch (e) {
                        error = true;
                    }
                    expect(error).to.be.true;
                });

                it("grantRole: PORTFOLIO_AGENT_ROLE [revert]", async function () {
                    let error = false;
                    try {
                        await exchange.grantRole(PORTFOLIO_AGENT_ROLE, collector.address);
                        await exchange.connect(collector).grantRole(PORTFOLIO_AGENT_ROLE, testAccount.address)
                    } catch (e) {
                        error = true;
                    }
                    expect(error).to.be.true;
                });

                it("grantRole: DEFAULT_ADMIN_ROLE [revert]", async function () {
                    let error = false;
                    try {
                        await exchange.grantRole(PORTFOLIO_AGENT_ROLE, collector.address);
                        await exchange.connect(collector).grantRole(await exchange.DEFAULT_ADMIN_ROLE(), testAccount.address)
                    } catch (e) {
                        error = true;
                    }
                    expect(error).to.be.true;
                });

            });

            describe('Mint/Redeem', function () {


                describe('Mint', function () {

                    it("Revert: Only asset available for buy", async function () {
                        await expectRevert(exchange.mint({
                            asset: usdPlus.address,
                            amount: toAsset(10),
                            referral: ''
                        }), 'Only asset available for buy');
                    });

                    it("Revert: Not enough tokens to buy", async function () {
                        await expectRevert(exchange.mint({
                            asset: asset.address,
                            amount: toAsset(10),
                            referral: ''
                        }), 'Not enough tokens to buy');
                    });

                    it("Revert: Amount of asset is zero", async function () {
                        await expectRevert(exchange.mint({
                            asset: asset.address,
                            amount: toAsset(0),
                            referral: ''
                        }), 'Amount of asset is zero');
                    });

                    it("deposit: nav correct", async function () {
                        await mint(10);
                        expect(await asset.balanceOf(pm.address)).to.equal(toAsset(10));
                        expect(await pm.totalNetAssets()).to.equal(toAsset(10));
                    });


                    it("asset.transferFrom", async function () {

                        await asset.mint(account, toAsset(10));
                        await asset.approve(exchange.address, toAsset(10));

                        let assetBalanceBefore = await asset.balanceOf(account);
                        await exchange.mint({asset: asset.address, amount: toAsset(10), referral: ''});
                        let assetBalanceAfter = await asset.balanceOf(account);
                        expect(10).to.equal(fromAsset(assetBalanceBefore.sub(assetBalanceAfter)));
                    });


                    it("usdPlus.mint | fee 0", async function () {
                        expect(0).to.equal(fromRebase(await usdPlus.balanceOf(account)));
                        await mint(10);
                        expect(10).to.equal(fromRebase(await usdPlus.balanceOf(account)));
                    });

                    it("rebase.mint | fee 10%", async function () {
                        expect(0).to.equal(fromRebase(await usdPlus.balanceOf(account)));

                        await exchange.setBuyFee(10000, 100000);
                        await mint(10);
                        expect(9).to.equal(fromRebase(await usdPlus.balanceOf(account)));
                    });

                    it("[FREE_RIDER_ROLE] rebase.mint | fee 10%", async function () {
                        expect(0).to.equal(fromRebase(await usdPlus.balanceOf(account)));

                        await exchange.setBuyFee(10000, 100000);
                        await exchange.grantRole(await exchange.FREE_RIDER_ROLE(), account);

                        await mint(10);
                        expect(10).to.equal(fromRebase(await usdPlus.balanceOf(account)));
                    });


                    it("event EventExchange", async function () {

                        await exchange.setBuyFee(10000, 100000);
                        let tx = await (await mint(10)).wait();

                        let event = tx.events.find((e) => e.event == 'EventExchange');

                        expect('mint').to.equal(event.args[0]);
                        expect(9).to.equal(fromRebase(event.args[1]));
                        expect(1).to.equal(fromRebase(event.args[2]));
                        expect(account).to.equal(event.args[3]);
                        expect('').to.equal(event.args[4]);
                    });


                });

                describe('Redeem', function () {

                    it("Revert: Only asset available for redeem", async function () {
                        await expectRevert(exchange.redeem(usdPlus.address, 0), 'Only asset available for redeem');
                    });

                    it("Revert: Amount of USD+ is zero", async function () {
                        await expectRevert(exchange.redeem(asset.address, 0), 'Amount of USD+ is zero');
                    });

                    it("Revert: Not enough tokens to redeem", async function () {
                        await expectRevert(exchange.redeem(asset.address, 10), 'Not enough tokens to redeem');
                    });


                    it("usdPlus.burn | fee 0", async function () {
                        await mint(100);
                        expect(100).to.equal(fromRebase(await usdPlus.balanceOf(account)));
                        await redeem(100);
                        expect(0).to.equal(fromRebase(await usdPlus.balanceOf(account)));
                    });

                    it("usdPlus.burn | fee 10%", async function () {
                        await mint(100);
                        expect(100).to.equal(fromRebase(await usdPlus.balanceOf(account)));
                        await exchange.setRedeemFee(10000, 100000);
                        await redeem(100);
                        expect(0).to.equal(fromRebase(await usdPlus.balanceOf(account)));
                    });


                    it("asset.transfer | fee 0", async function () {
                        await mint(100);
                        expect(0).to.equal(fromAsset(await asset.balanceOf(account)));
                        await redeem(100);
                        expect(100).to.equal(fromAsset(await asset.balanceOf(account)));
                    });

                    it("[FREE_RIDER_ROLE] asset.transfer | fee 10%", async function () {
                        await mint(100);
                        expect(0).to.equal(fromAsset(await asset.balanceOf(account)));
                        await exchange.setRedeemFee(10000, 100000);
                        await exchange.grantRole(await exchange.FREE_RIDER_ROLE(), account);
                        await redeem(100);
                        expect(100).to.equal(fromAsset(await asset.balanceOf(account)));
                    });


                    it("event EventExchange", async function () {

                        await mint(100);

                        await exchange.setRedeemFee(10000, 100000);
                        let tx = await (await redeem(100)).wait();

                        let event = tx.events.find((e) => e.event == 'EventExchange');

                        expect('redeem').to.equal(event.args[0]);
                        expect(90).to.equal(fromAsset(event.args[1]));
                        expect(10).to.equal(fromAsset(event.args[2]));
                        expect(account).to.equal(event.args[3]);
                        expect('').to.equal(event.args[4]);
                    });


                    it("withdraw: nav correct", async function () {
                        await mint(10);
                        await redeem(10);
                        expect(await asset.balanceOf(pm.address)).to.equal(toAsset(0));
                        expect(await pm.totalNetAssets()).to.equal(toAsset(0));
                    });


                    it("withdraw: Not enough for transfer redeemAmount", async function () {
                        await mint(10);

                        await pm.setNavLess(true, testAccount.address);
                        await expectRevert(exchange.redeem(asset.address, toRebase(10)), "Not enough for transfer redeemAmount");
                    });


                });
            });

            describe('Payout: Negative', function () {

                let odosEmptyData;

                sharedBeforeEach("Payout: Negative", async () => {
                    await exchange.grantRole(UNIT_ROLE, account);
                    let zeroAddress = "0x0000000000000000000000000000000000000000";
                    odosEmptyData = {
                        inputTokenAddress: zeroAddress,
                        outputTokenAddress: zeroAddress,
                        amountIn: 1,
                        data: "0x"
                    }
                });

                it("revert: OracleLoss", async function () {

                    await mint(100);
                    await pm.withdraw(toAsset(1));
                    await exchange.setOracleLoss(5000, 100000); // 5%
                    await expectRevert(exchange.payout(false, odosEmptyData), 'OracleLoss');
                });

                it("compensate", async function () {

                    await mint(100);
                    await pm.withdraw(toAsset(1));

                    await asset.mint(insurance.address, toAsset(10));

                    await exchange.setOracleLoss(0, 100000);
                    await exchange.setCompensateLoss(1000, 100000); // 1%
                    let tx = await (await exchange.payout(false, odosEmptyData)).wait();

                    expect(101).to.equal(fromAsset(await asset.balanceOf(pm.address)));
                    expect(101).to.equal(fromRebase(await usdPlus.totalSupply()));
                    expect('1010000000000000000000000000').to.equal(await usdPlus.liquidityIndex());

                    let event = tx.events.find((e) => e.event === 'PayoutEvent');

                    expect(1).to.equal(fromRebase(event.args[0]));
                    expect('1010000000000000000000000000').to.equal(event.args[1]);
                    expect(0).to.equal(fromRebase(event.args[2]));
                });
            });

            describe('Payout: Positive', function () {

                let odosEmptyData;

                sharedBeforeEach("Payout: Positive", async () => {
                    await exchange.grantRole(UNIT_ROLE, account);
                    let zeroAddress = "0x0000000000000000000000000000000000000000";
                    odosEmptyData = {
                        inputTokenAddress: zeroAddress,
                        outputTokenAddress: zeroAddress,
                        amountIn: 1,
                        data: "0x"
                    }
                });

                it("revert: profitRecipient address is zero", async function () {

                    await mint(100);
                    await asset.mint(pm.address, toAsset(1));
                    await expectRevert(exchange.payout(false, odosEmptyData), 'profitRecipient address is zero');

                });

                it("premium", async function () {

                    await mint(100);
                    await asset.mint(pm.address, toAsset(10));

                    await exchange.setProfitRecipient(testAccount.address);
                    await exchange.setAbroad(0, 5000350);

                    await pm.setTotalRiskFactor(10000); // 10%

                    let tx = await (await exchange.payout(false, odosEmptyData)).wait();

                    expect(1).to.equal(fromAsset(await asset.balanceOf(insurance.address)));
                    expect(109).to.equal(fromAsset(await asset.balanceOf(pm.address)));
                    expect(109).to.equal(fromRebase(await usdPlus.totalSupply()));
                    expect('1090000000000000000000000000').to.equal(await usdPlus.liquidityIndex());

                    let event = tx.events.find((e) => e.event === 'PayoutEvent');

                    expect(9).to.equal(fromRebase(event.args[0]));
                    expect('1090000000000000000000000000').to.equal(event.args[1]);
                    expect(0).to.equal(fromRebase(event.args[2]));
                });

                it("excessProfit", async function () {

                    await mint(100);
                    await asset.mint(pm.address, toAsset(10));

                    await exchange.setProfitRecipient(testAccount.address);

                    await exchange.setAbroad(0, 1000350);
                    await pm.setTotalRiskFactor(0); // 0%


                    let tx = await (await exchange.payout(false, odosEmptyData)).wait();

                    expect(0).to.equal(fromAsset(await asset.balanceOf(insurance.address)));
                    expect(110).to.equal(fromAsset(await asset.balanceOf(pm.address)));
                    expect(9.965).to.equal(fromRebase(await usdPlus.balanceOf(testAccount.address)));
                    expect(110).to.equal(fromRebase(await usdPlus.totalSupply()));

                    expect('1000350004278315086479393931').to.equal(await usdPlus.liquidityIndex());

                    let event = tx.events.find((e) => e.event === 'PayoutEvent');

                    expect(0.038487).to.equal(fromRebase(event.args[0]));
                    expect('1000350004278315086479393931').to.equal(event.args[1]);
                    expect(9.961513).to.equal(fromRebase(event.args[2]));
                });

                it("premium + excessProfit", async function () {

                    await mint(100);
                    await asset.mint(pm.address, toAsset(10));

                    await exchange.setProfitRecipient(testAccount.address);

                    await exchange.setAbroad(0, 1000350);
                    await pm.setTotalRiskFactor(50000); // 50%

                    let tx = await (await exchange.payout(false, odosEmptyData)).wait();

                    expect(5).to.equal(fromAsset(await asset.balanceOf(insurance.address)));
                    expect(105).to.equal(fromAsset(await asset.balanceOf(pm.address)));
                    expect(4.965).to.equal(fromRebase(await usdPlus.balanceOf(testAccount.address)));
                    expect(105).to.equal(fromRebase(await usdPlus.totalSupply()));

                    expect('1000349998646669358973720167').to.equal(await usdPlus.liquidityIndex());

                    let event = tx.events.find((e) => e.event === 'PayoutEvent');

                    expect(0.036737).to.equal(fromRebase(event.args[0]));
                    expect('1000349998646669358973720167').to.equal(event.args[1]);
                    expect(4.963263).to.equal(fromRebase(event.args[2]));
                });
            });

            describe("Multi call", function () {

                sharedBeforeEach("buy usd+", async () => {

                    await mint(100);
                    // transfer 100 usd+ and 100 asset to multicall tester
                    await asset.mint(multiCallWrapper.address, toAsset(100));
                    await usdPlus.transfer(multiCallWrapper.address, toRebase(100));
                    await pm.setIsBalanced(false);
                });

                it("two buys should pass", async function () {
                    await multiCallWrapper.buy2(asset.address, usdPlus.address, toAsset(1), toAsset(1))
                });

                it("buy into redeem should pass", async function () {
                    await multiCallWrapper.buyRedeem(asset.address, usdPlus.address, toAsset(1), toRebase(1));
                });

                it("buy into redeem&balance should fail", async function () {
                    await pm.setIsBalanced(true);
                    await expectRevert(
                        multiCallWrapper.buyRedeem(asset.address, usdPlus.address, toAsset(1), toRebase(1)),
                        "Only once in block"
                    );
                });

                it("two redeems should pass", async function () {
                    await multiCallWrapper.redeem2(asset.address, usdPlus.address, toRebase(1), toRebase(1))
                });

                it("two redeems&balance should fail", async function () {
                    await pm.setIsBalanced(true);
                    await expectRevert(
                        multiCallWrapper.redeem2(asset.address, usdPlus.address, toRebase(1), toRebase(1)),
                        "Only once in block"
                    );
                });

                it("redeem into buy should pass", async function () {
                    await multiCallWrapper.redeemBuy(asset.address, usdPlus.address, toRebase(1), toAsset(1))
                });

                it("buy into redeem&balance should pass with FREE_RIDER_ROLE", async function () {
                    await exchange.grantRole(await exchange.FREE_RIDER_ROLE(), multiCallWrapper.address);
                    await pm.setIsBalanced(true);
                    await multiCallWrapper.buyRedeem(asset.address, usdPlus.address, toAsset(1), toRebase(1));
                });

                it("two redeems&balance should pass with FREE_RIDER_ROLE", async function () {
                    await exchange.grantRole(await exchange.FREE_RIDER_ROLE(), multiCallWrapper.address);
                    await pm.setIsBalanced(true);
                    await multiCallWrapper.redeem2(asset.address, usdPlus.address, toRebase(1), toRebase(1));
                });

                it("redeem&balance into buy should pass with FREE_RIDER_ROLE", async function () {
                    await exchange.grantRole(await exchange.FREE_RIDER_ROLE(), multiCallWrapper.address);
                    await pm.setIsBalanced(true);
                    await multiCallWrapper.redeemBuy(asset.address, usdPlus.address, toRebase(1), toAsset(1));
                });
            });


            async function mint(sum) {
                sum = toAsset(sum);

                await asset.mint(account, sum);
                await asset.approve(exchange.address, sum);
                return await exchange.buy(asset.address, sum);
            }


            async function redeem(sum) {
                sum = toRebase(sum);

                await usdPlus.approve(exchange.address, sum);
                return await exchange.redeem(asset.address, sum);
            }


        });


    });


});
