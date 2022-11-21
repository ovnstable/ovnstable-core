const {expect} = require("chai");
const {deployments, ethers, getNamedAccounts} = require('hardhat');
const {toE6, fromE6, toE18, fromE18} = require("@overnight-contracts/common/utils/decimals");
const hre = require("hardhat");
const {resetHardhat, createRandomWallet} = require("@overnight-contracts/common/utils/tests");
const expectRevert = require("@overnight-contracts/common/utils/expectRevert");
const {sharedBeforeEach} = require("@overnight-contracts/common/utils/sharedBeforeEach")
const chai = require("chai");
chai.use(require('chai-bignumber')());


describe("InsuranceExchange", function () {

    let account;
    let insurance;
    let pm;
    let rebase;
    let asset;

    let testAccount;

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


        describe(`Decimal: asset [${decimal.asset}] rebase [{${decimal.rebase}]`, async function () {

            sharedBeforeEach("deploy contracts", async () => {
                await hre.run("compile");
                await resetHardhat(process.env.STAND);

                await deployments.fixture(['MockInsurance']);

                const {deployer} = await getNamedAccounts();
                account = deployer;
                testAccount = await createRandomWallet();

                insurance = await ethers.getContract("InsuranceExchange");
                pm = await ethers.getContract("MockPortfolioManager");
                rebase = await ethers.getContract('RebaseToken');
                asset = await ethers.getContract('AssetToken');


                if (decimal.rebase === 6){
                    toRebase = toE6;
                    fromRebase = fromE6;
                }else {
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
                await rebase.setDecimals(decimal.rebase);
            });


            describe('Mint/Redeem', function () {


                describe('Mint', function () {

                    it("Revert: Amount of asset is zero", async function () {
                        await expectRevert(insurance.mint({amount: 0}), 'Amount of asset is zero');
                    });

                    it("Revert: Not enough tokens to mint", async function () {
                        await expectRevert(insurance.mint({amount: toAsset(10)}), 'Not enough tokens to mint');
                    });

                    it("deposit: nav correct", async function () {
                        await mint(10);
                        expect(await asset.balanceOf(pm.address)).to.equal(toAsset(10));
                        expect(await asset.balanceOf(insurance.address)).to.equal(toAsset(0));
                        expect(await pm.totalNetAssets()).to.equal(toAsset(10));
                    });


                    it("asset.transferFrom", async function () {

                        await asset.mint(account, toAsset(10));
                        await asset.approve(insurance.address, toAsset(10));
                        let assetBalanceBefore = await asset.balanceOf(account);
                        await insurance.mint({amount: toAsset(10)})
                        let assetBalanceAfter = await asset.balanceOf(account);
                        expect(10).to.equal(fromAsset(assetBalanceBefore.sub(assetBalanceAfter)));
                    });


                    it("rebase.mint | fee 0", async function () {
                        expect(0).to.equal(fromRebase(await rebase.balanceOf(account)));
                        await mint(10);
                        expect(10).to.equal(fromRebase(await rebase.balanceOf(account)));
                    });

                    it("rebase.mint | fee 10%", async function () {
                        expect(0).to.equal(fromRebase(await rebase.balanceOf(account)));

                        await insurance.setMintFee(10000, 100000);
                        await mint(10);
                        expect(9).to.equal(fromRebase(await rebase.balanceOf(account)));
                    });

                    it("event MintBurn", async function () {

                        await insurance.setMintFee(10000, 100000);
                        let tx = await (await mint(10)).wait();

                        let event = tx.events.find((e) => e.event == 'MintBurn');

                        expect('mint').to.equal(event.args[0]);
                        expect(9).to.equal(fromRebase(event.args[1]));
                        expect(1).to.equal(fromRebase(event.args[2]));
                        expect(account).to.equal(event.args[3]);
                    });


                });

                describe('Redeem', function () {

                    it("Revert: Amount of asset is zero", async function () {
                        await expectRevert(insurance.redeem({amount: 0}), 'Amount of asset is zero');
                    });


                    it("Revert: Not enough tokens to redeem", async function () {
                        await expectRevert(insurance.redeem({amount: 10}), 'Not enough tokens to redeem');
                    });


                    it("checkWithdraw: need withdraw request", async function () {
                        await mint(10);
                        await expectRevert(insurance.redeem({amount: toRebase(10)}), 'need withdraw request');
                    });

                    it("checkWithdraw: requestWaitPeriod", async function () {
                        await mint(10);
                        await requestWithdraw();
                        await expectRevert(insurance.redeem({amount: toRebase(10)}), 'requestWaitPeriod');
                    });

                    it("checkWithdraw: withdrawPeriod", async function () {
                        await mint(10);
                        await requestWithdraw();
                        await waitWithdrawPeriod();
                        await expectRevert(insurance.redeem({amount: toRebase(10)}), 'withdrawPeriod');
                    });

                    it("checkWithdraw -> wait -> mint -> revert", async function () {
                        await mint(10);
                        await requestWithdraw();
                        await waitPeriod();
                        await mint(5);
                        await expectRevert(insurance.redeem({amount: toRebase(10)}), 'need withdraw request');
                    });

                    it("checkWithdraw -> wait -> redeem -> redeem -> revert", async function () {
                        await mint(10);
                        await requestWithdraw();
                        await waitPeriod();
                        await redeem(5);
                        await expectRevert(insurance.redeem({amount: toRebase(5)}), 'need withdraw request');
                    });

                    it("checkWithdraw -> TRUST_ROLE -> ignore", async function () {
                        await mint(10);

                        await insurance.grantRole(await insurance.TRUST_ROLE(), account);
                        await redeem(10);
                    });


                    it("rebase.burn | fee 0", async function () {
                        await mint(100);
                        expect(100).to.equal(fromRebase(await rebase.balanceOf(account)));
                        await redeem(100);
                        expect(0).to.equal(fromRebase(await rebase.balanceOf(account)));
                    });

                    it("rebase.burn | fee 10%", async function () {
                        await mint(100);
                        expect(100).to.equal(fromRebase(await rebase.balanceOf(account)));
                        await insurance.setRedeemFee(10000, 100000);
                        await redeem(100);
                        expect(0).to.equal(fromRebase(await rebase.balanceOf(account)));
                    });

                    it("asset.transfer | fee 0", async function () {
                        await mint(100);
                        expect(0).to.equal(fromAsset(await asset.balanceOf(account)));
                        await redeem(100);
                        expect(100).to.equal(fromAsset(await asset.balanceOf(account)));
                    });

                    it("asset.transfer | fee 10%", async function () {
                        await mint(100);
                        expect(0).to.equal(fromAsset(await asset.balanceOf(account)));
                        await insurance.setRedeemFee(10000, 100000);
                        await redeem(100);
                        expect(90).to.equal(fromAsset(await asset.balanceOf(account)));
                    });


                    it("event MintBurn", async function () {

                        await mint(100);

                        await insurance.setRedeemFee(10000, 100000);
                        let tx = await (await redeem(100)).wait();

                        let event = tx.events.find((e) => e.event == 'MintBurn');

                        expect('redeem').to.equal(event.args[0]);
                        expect(100).to.equal(fromRebase(event.args[1]));
                        expect(10).to.equal(fromRebase(event.args[2]));
                        expect(account).to.equal(event.args[3]);
                    });


                    it("withdraw: nav correct", async function () {
                        await mint(10);
                        await redeem(10);
                        expect(await asset.balanceOf(pm.address)).to.equal(toAsset(0));
                        expect(await asset.balanceOf(insurance.address)).to.equal(toAsset(0));
                        expect(await pm.totalNetAssets()).to.equal(toAsset(0));
                    });


                    it("withdraw: Not enough for transfer", async function () {
                        await mint(10);

                        await rebase.approve(insurance.address, toRebase(10));
                        await requestWithdraw();
                        await waitPeriod();

                        await pm.setNavLess(true, testAccount.address);
                        await expectRevert(insurance.redeem({amount: toRebase(10)}), "Not enough for transfer");
                    });


                });

                describe('Insurance Holder', function () {

                    sharedBeforeEach("Insurance Holder", async () => {
                        await insurance.grantRole(await insurance.INSURANCE_HOLDER_ROLE(), account);
                    });

                    it("addPremium: Not enough for transfer", async function () {
                        await expectRevert(insurance.addPremium(toAsset(10)), 'Not enough for transfer');
                    });


                    it("addPremium: transferFrom", async function () {

                        await asset.mint(account, toAsset(10));
                        await asset.approve(insurance.address, toAsset(10));
                        await insurance.addPremium(toAsset(10));

                        await expect(10).to.equal(fromAsset(await asset.balanceOf(pm.address)));
                        await expect(10).to.equal(fromAsset(await pm.totalNetAssets()));
                        await expect(0).to.equal(fromAsset(await asset.balanceOf(account)));
                    });

                    it("getInsurance: Not enough for transfer", async function () {
                        await asset.mint(pm.address, toAsset(10));
                        await pm.setNavLess(true, testAccount.address);
                        await expectRevert(insurance.getInsurance(toAsset(10), account), 'Not enough for transfer');
                    });

                    it("getInsurance: transfer", async function () {
                        await asset.mint(pm.address, toAsset(10));
                        await insurance.getInsurance(toAsset(10), account);

                        await expect(0).to.equal(fromAsset(await asset.balanceOf(pm.address)));
                        await expect(0).to.equal(fromAsset(await pm.totalNetAssets()));
                        await expect(10).to.equal(fromAsset(await asset.balanceOf(account)));
                    });
                });


                describe('Payout: Positive', function () {

                    let tx;
                    sharedBeforeEach("Payout: Positive", async () => {

                        await mint(10);
                        await asset.mint(pm.address, toAsset(1));
                        tx = await (await insurance.payout()).wait();
                    });

                    it("Rebase: equal", async function () {
                        expect(11).to.equal(fromRebase(await rebase.balanceOf(account)));
                    });


                    it("nav: equal", async function () {
                        expect(11).to.equal(fromAsset(await pm.totalNetAssets()));
                    });


                    it("event PayoutEvent", async function () {

                        let event = tx.events.find((e) => e.event == 'PayoutEvent');

                        expect(1).to.equal(fromRebase(event.args[0]));
                        expect('1100000000000000000000000000').to.equal(event.args[1].toString());
                    });

                    it("event NextPayoutTime", async function () {

                        let event = tx.events.find((e) => e.event == 'NextPayoutTime');
                        expect(event).to.not.be.null;
                    })

                });

                describe('Payout: Negative', function () {

                    let tx;
                    sharedBeforeEach("Payout: Negative", async () => {

                        await mint(10);
                        await asset.burn(pm.address, toAsset(1));
                        tx = await (await insurance.payout()).wait();
                    });

                    it("Rebase: equal", async function () {
                        expect(9).to.equal(fromRebase(await rebase.balanceOf(account)));
                    });


                    it("nav: equal", async function () {
                        expect(9).to.equal(fromAsset(await pm.totalNetAssets()));
                    });


                    it("event PayoutEvent", async function () {

                        let event = tx.events.find((e) => e.event == 'PayoutEvent');

                        expect(-1).to.equal(fromRebase(event.args[0]));
                        expect('900000000000000000000000000').to.equal(event.args[1].toString());
                    });

                    it("event NextPayoutTime", async function () {

                        let event = tx.events.find((e) => e.event == 'NextPayoutTime');
                        expect(event).to.not.be.null;
                    })
                });


            });
        });


        async function redeem(sum) {
            sum = toRebase(sum);
            await rebase.approve(insurance.address, sum);
            await requestWithdraw();
            await waitPeriod();
            return await insurance.redeem({amount: sum});
        }

        async function requestWithdraw() {
            await insurance.requestWithdraw();
        }

        async function mint(sum) {
            sum = toAsset(sum);

            await asset.mint(account, sum);
            await asset.approve(insurance.address, sum);
            return await insurance.mint({amount: sum});
        }

        async function waitPeriod() {

            let delay = await insurance.requestWaitPeriod();

            await ethers.provider.send("evm_increaseTime", [delay.toNumber()]);
            await ethers.provider.send('evm_mine');
        }

        async function waitWithdrawPeriod() {

            let delay = await insurance.requestWaitPeriod();
            let withdrawPeriod = await insurance.withdrawPeriod();

            await ethers.provider.send("evm_increaseTime", [delay.toNumber() + withdrawPeriod.toNumber()]);
            await ethers.provider.send('evm_mine');
        }


    });
});


