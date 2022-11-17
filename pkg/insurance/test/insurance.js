const {expect} = require("chai");
const {deployments, ethers, getNamedAccounts} = require('hardhat');
const {toE6, fromE6, toE18, fromE18} = require("@overnight-contracts/common/utils/decimals");
const hre = require("hardhat");
const BigNumber = require('bignumber.js');
const {greatLess, resetHardhat, createRandomWallet} = require("@overnight-contracts/common/utils/tests");
const expectRevert = require("@overnight-contracts/common/utils/expectRevert");
const {evmCheckpoint, evmRestore, sharedBeforeEach} = require("@overnight-contracts/common/utils/sharedBeforeEach")
let {DEFAULT} = require('@overnight-contracts/common/utils/assets');
const chai = require("chai");
chai.use(require('chai-bignumber')());
const {ZERO_ADDRESS} = require("@openzeppelin/test-helpers/src/constants");
const {waffle} = require("hardhat");
const {getAbi, getERC20, transferUSDC} = require("@overnight-contracts/common/utils/script-utils");
const {deployMockContract, provider} = waffle;

const SENIOR = 0;
const JUNIOR = 1;

describe("InsuranceExchange", function () {

    let account;
    let insurance;
    let rebase;
    let asset;

    let testAccount;

    let toAsset = function () {
    };
    let fromAsset = function () {
    };

    let balanceAssetBefore;

    sharedBeforeEach("deploy contracts", async () => {
        await hre.run("compile");
        await resetHardhat(process.env.STAND);

        await deployments.fixture(['MockInsurance']);

        const {deployer} = await getNamedAccounts();
        account = deployer;
        testAccount = await createRandomWallet();

        insurance = await ethers.getContract("InsuranceExchange");
        rebase = await ethers.getContract('RebaseToken');
        asset = await ethers.getContract('AssetToken');

        toAsset = toE6;
        fromAsset = fromE6;

        await transferUSDC(1, account);
    });


    describe('Mint/Redeem', function () {


        describe('Mint', function () {

            it("Revert: Max mint junior", async function () {
                await expectRevert(insurance.mint({amount: toE6(100), tranche: JUNIOR}), 'Max mint junior');
            });

            it("Revert: Amount of asset is zero", async function () {
                await expectRevert(insurance.mint({amount: 0, tranche: JUNIOR}), 'Amount of asset is zero');
                await expectRevert(insurance.mint({amount: 0, tranche: SENIOR}), 'Amount of asset is zero');
            });

            it("Revert: Not enough tokens to mint", async function () {
                await expectRevert(insurance.connect(testAccount).mint({
                    amount: 100,
                    tranche: SENIOR
                }), 'Not enough tokens to mint');
                await expectRevert(insurance.connect(testAccount).mint({
                    amount: 100,
                    tranche: JUNIOR
                }), 'Not enough tokens to mint');
            });

            it("Senior: nav correct", async function () {
                await mintSenior(800);
                expect(await asset.balanceOf(insurance.address)).to.equal(toE6(800));
                expect(await insurance.netAssetValue()).to.equal(toE6(800));
            });

            it("Junior: nav correct", async function () {
                await mintSenior(800);
                await mintSenior(200);
                expect(await asset.balanceOf(insurance.address)).to.equal(toE6(1000));
                expect(await insurance.netAssetValue()).to.equal(toE6(1000));
            });

            it("Senior: asset.transferFrom", async function () {

                let assetBalanceBefore = await asset.balanceOf(account);
                await mintSenior(100);
                let assetBalanceAfter = await asset.balanceOf(account);
                expect(100).to.equal(fromE6(assetBalanceBefore.sub(assetBalanceAfter).toNumber()));
            });

            it("Junior: asset.transferFrom", async function () {

                let assetBalanceBefore = await asset.balanceOf(account);
                await mintSenior(800);
                await mintJunior(200);
                let assetBalanceAfter = await asset.balanceOf(account);
                expect(1000).to.equal(fromE6(assetBalanceBefore.sub(assetBalanceAfter).toNumber()));
            });

            it("Senior: token.mint", async function () {
                expect(0).to.equal(fromE6(await senior.balanceOf(account)));
                await mintSenior(100);
                expect(100).to.equal(fromE6(await senior.balanceOf(account)));
            });

            it("Junior: token.mint", async function () {
                expect(0).to.equal(fromE6(await junior.balanceOf(account)));
                await mintSenior(800);
                await mintJunior(200);
                expect(200).to.equal(fromE6(await junior.balanceOf(account)));
            });

            it("Senior: Revert: NAV less than expected", async function () {
                await mintSenior(100);

                await insurance.setNavLess(true, testAccount.address);

                await (await asset.approve(insurance.address, toE6(100))).wait();
                await expectRevert(insurance.mint({amount: toE6(100), tranche: SENIOR}), 'NAV less than expected');
            });

            it("Junior: Revert: NAV less than expected", async function () {
                await mintSenior(800);

                await insurance.setNavLess(true, testAccount.address);

                await (await asset.approve(insurance.address, toE6(100))).wait();
                await expectRevert(insurance.mint({amount: toE6(100), tranche: JUNIOR}), 'NAV less than expected');
            });

        });

        describe('Redeem', function () {

            it("Revert: Amount of asset is zero", async function () {
                await expectRevert(insurance.redeem({amount: 0, tranche: JUNIOR}), 'Amount of asset is zero');
                await expectRevert(insurance.redeem({amount: 0, tranche: SENIOR}), 'Amount of asset is zero');
            });

            it("Revert: Max redeem junior", async function () {
                await mintSenior(800);
                await mintJunior(200);
                await expectRevert(insurance.redeem({amount: toE6(100), tranche: JUNIOR}), 'Max redeem junior');
            });


            it("Revert: Not enough tokens to mint", async function () {
                await mintSenior(1000);
                await mintJunior(200);

                await expectRevert(insurance.connect(testAccount).redeem({
                    amount: 10,
                    tranche: SENIOR
                }), 'Not enough tokens to redeem');
                await expectRevert(insurance.connect(testAccount).redeem({
                    amount: 10,
                    tranche: JUNIOR
                }), 'Not enough tokens to redeem');
            });

            it("Senior: token.burn", async function () {
                expect(0).to.equal(fromE6(await senior.balanceOf(account)));
                await mintSenior(100);
                expect(100).to.equal(fromE6(await senior.balanceOf(account)));
                await redeemSenior(100);
                expect(0).to.equal(fromE6(await senior.balanceOf(account)));
            });

            it("Junior: token.mint", async function () {
                expect(0).to.equal(fromE6(await junior.balanceOf(account)));
                await mintSenior(800);
                await mintJunior(200);
                expect(200).to.equal(fromE6(await junior.balanceOf(account)));

            });

            it("Senior: nav correct", async function () {
                await mintSenior(800);
                await redeemSenior(500);

                expect(await asset.balanceOf(insurance.address)).to.equal(toE6(300));
                expect(await insurance.netAssetValue()).to.equal(toE6(300));
            });

            it("Junior: nav correct", async function () {
                await mintSenior(800);
                await mintJunior(200);
                await redeemJunior(10);
                expect(await asset.balanceOf(insurance.address)).to.equal(toE6(990));
                expect(await insurance.netAssetValue()).to.equal(toE6(990));
            });

            it("Senior: Revert: NAV less than expected", async function () {
                await mintSenior(100);

                await insurance.setNavLess(true, testAccount.address);

                await (await senior.approve(insurance.address, toE6(10))).wait();
                await expectRevert(insurance.redeem({amount: toE6(10), tranche: SENIOR}), 'NAV less than expected');
            });

            it("Junior: Revert: NAV less than expected", async function () {
                await mintSenior(800);
                await mintJunior(200);

                await insurance.setNavLess(true, testAccount.address);

                await (await asset.approve(insurance.address, toE6(10))).wait();
                await expectRevert(insurance.mint({amount: toE6(10), tranche: JUNIOR}), 'NAV less than expected');
            });

            it("Senior: asset.transferFrom", async function () {

                await mintSenior(100);
                let assetBalanceBefore = await asset.balanceOf(account);
                await redeemSenior(100);
                let assetBalanceAfter = await asset.balanceOf(account);
                expect(100).to.equal(fromE6(assetBalanceAfter.sub(assetBalanceBefore).toNumber()));
            });

            it("Junior: asset.transferFrom", async function () {

                await mintSenior(800);
                await mintJunior(200);
                let assetBalanceBefore = await asset.balanceOf(account);
                await redeemJunior(10);
                let assetBalanceAfter = await asset.balanceOf(account);
                expect(10).to.equal(fromE6(assetBalanceAfter.sub(assetBalanceBefore).toNumber()));
            });
        });


        describe('Payout: Positive', function () {

            sharedBeforeEach("Payout: Positive", async () => {

                await mintSenior(400);
                await mintJunior(10);
                await asset.transfer(insurance.address, toE6(1));
                // await insurance.setAvgApy(7500000); // 7.5%
                await insurance.payout(7500000);
            });

            it("Junior: equal", async function () {
                expect(10917812).to.equal(await junior.balanceOf(account));
            });

            it("Senior: equal", async function () {
                expect(400082188).to.equal(await senior.balanceOf(account));
            });

            it("nav: equal", async function () {
                expect(411000000).to.equal(await insurance.netAssetValue());
            });

            it("totalSupply: equal", async function () {
                expect(411000000).to.equal(await insurance.totalSupply());
            });
        });

        describe('Payout: Negative', function () {

            sharedBeforeEach("Payout: Negative", async () => {

                await mintSenior(400);
                await mintJunior(10);
                // await insurance.setAvgApy(7500000); // 7.5%
                await insurance.payout(7500000);
            });

            it("Junior: equal", async function () {
                expect(9917812).to.equal(await junior.balanceOf(account));
            });

            it("Senior: equal", async function () {
                expect(400082188).to.equal(await senior.balanceOf(account));
            });

            it("nav: equal", async function () {
                expect(410000000).to.equal(await insurance.netAssetValue());
            });

            it("totalSupply: equal", async function () {
                expect(410000000).to.equal(await insurance.totalSupply());
            });
        });

        describe('Payout: Zero totalSupply', function () {

            it("Senior: totalSupply is zero", async function () {
                await mintSenior(400);
                await mintJunior(10);
                await redeemSenior(400);

                await insurance.payout(0);
                expect(10000000).to.equal(await insurance.totalSupply());
            });

            it("Junior: totalSupply is zero", async function () {
                await mintSenior(400);

                await insurance.payout(0);
                expect(400000000).to.equal(await insurance.totalSupply());
            });

        });

        describe('Payout: AvgApy', function () {

            it("avgApy abroad:min", async function () {
                await mintSenior(400);
                await mintJunior(10);
                await expectRevert(insurance.payout(10), 'avgApy abroad');

            });

            it("avgApy abroad:max", async function () {
                await mintSenior(400);
                await mintJunior(10);
                await expectRevert(insurance.payout(45000001), 'avgApy abroad');

            });

        });

    });


    async function startBalance() {
        balanceAssetBefore = await asset.balanceOf(account);
    }

    async function endBalance() {
        let balanceAssetAfter = await asset.balanceOf(account);
        expect(balanceAssetBefore).to.equal(balanceAssetAfter);
    }

    async function redeemJunior(sum) {
        sum = toE6(sum);
        await (await junior.approve(insurance.address, sum)).wait();
        await (await insurance.redeem({amount: sum, tranche: JUNIOR})).wait();
    }

    async function redeemSenior(sum) {
        sum = toE6(sum);
        await (await senior.approve(insurance.address, sum)).wait();
        await (await insurance.redeem({amount: sum, tranche: SENIOR})).wait();
    }

    async function mintJunior(sum) {
        sum = toE6(sum);
        await (await asset.approve(insurance.address, sum)).wait();
        await (await insurance.mint({amount: sum, tranche: JUNIOR})).wait();
    }

    async function mintSenior(sum) {
        sum = toE6(sum);
        await (await asset.approve(insurance.address, sum)).wait();
        await (await insurance.mint({amount: sum, tranche: SENIOR})).wait();
    }

    async function expectBalance(item) {
        expect(item.senior).to.equal(fromE6(await senior.balanceOf(account)));
        expect(item.junior).to.equal(fromE6(await junior.balanceOf(account)));

        expect(item.senior + item.junior).to.equal(fromE6(await insurance.totalSupply()));

        expect(item.maxMintJunior).to.equal(fromE6(await insurance.maxMintJunior()));
        expect(item.maxRedeemJunior).to.equal(fromE6(await insurance.maxRedeemJunior()));
    }
});


