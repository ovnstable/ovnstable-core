const {expect} = require("chai");
const {deployments, ethers, getNamedAccounts} = require('hardhat');
const {toE6, fromE6, toE18, fromE18} = require("@overnight-contracts/common/utils/decimals");
const hre = require("hardhat");
const {resetHardhat, createRandomWallet} = require("@overnight-contracts/common/utils/tests");
const expectRevert = require("@overnight-contracts/common/utils/expectRevert");
const {sharedBeforeEach} = require("@overnight-contracts/common/utils/sharedBeforeEach")
const chai = require("chai");
chai.use(require('chai-bignumber')());
const axios = require("axios");
const {OPTIMISM} = require("@overnight-contracts/common/utils/assets");

const {
    initWallet,
    getContract,
    getERC20,
    getERC20ByAddress, transferAsset
} = require("@overnight-contracts/common/utils/script-utils");
const {getOdosSwapData, getOdosAmountOut} = require("@overnight-contracts/common/utils/odos-helper");


describe("InsuranceExchangeIntegration", function () {

    let account;
    let insurance;
    let rebase;
    let asset;
    let usdc;

    let toAsset = toE18;
    let fromAsset = fromE18;
    let fromRebase = fromE18;
    let toRebase = toE18;

    describe(`Name`, async function () {

        sharedBeforeEach("deploy contracts", async () => {
            await hre.run("compile");
            await resetHardhat(process.env.STAND);

            await deployments.fixture(['Insurance']);

            const signers = await ethers.getSigners();
            account = signers[0];

            insurance = (await ethers.getContract("InsuranceExchange")).connect(account);
            rebase = (await ethers.getContract('InsuranceToken'));
            asset = (await getContract('Ovn')).connect(account);
            usdc = (await getERC20ByAddress(OPTIMISM.usdc)).connect(account);


            // insurance setting
            let params = {
                asset: asset.address,
                rebase: rebase.address,
                odosRouter: OPTIMISM.odosRouterV2
            }

            await (await rebase.setExchanger(insurance.address)).wait();
            await (await rebase.setName('USD+ Insurance', 'USD+ INS')).wait();
            await (await insurance.setUpParams(params)).wait();
            await (await insurance.grantRole(await insurance.INSURED_ROLE(), account.address)).wait();

            // insurance setting end

            await transferAsset(OPTIMISM.usdc, account.address);
            await transferAsset(OPTIMISM.ovn, account.address);
            await asset.approve(insurance.address, toAsset("400"));
            await insurance.mint({amount: toAsset("400")});
        });

        describe('Odos', function () {

            sharedBeforeEach("Odos", async () => {
                console.log("usdc account balance", (await usdc.balanceOf(account.address)).toString());
                console.log("ovn insurance balance", (await asset.balanceOf(insurance.address)).toString());
            });

            it("Odos Premium", async function () {
                await usdc.transfer(insurance.address, 10000000);
                let insUsdcBalanceBefore = (await usdc.balanceOf(insurance.address));
                let insOvnBalanceBefore = (await asset.balanceOf(insurance.address));
                console.log("usdc balance", insUsdcBalanceBefore.toString());
                console.log("ovn balance", insOvnBalanceBefore.toString());
                let swapData = await getOdosSwapData(usdc.address, asset.address, 10000000);
                console.log(swapData);
                await insurance.premium(swapData);
                let insUsdcBalanceAfter = (await usdc.balanceOf(insurance.address));
                let insOvnBalanceAfter = (await asset.balanceOf(insurance.address));
                console.log("usdc balance", insUsdcBalanceAfter.toString());
                console.log("ovn balance", insOvnBalanceAfter.toString());
                expect(0).to.equal(fromRebase(insUsdcBalanceAfter));
                expect(insOvnBalanceBefore).to.lte(insOvnBalanceAfter);
            })

            it("Odos Compensate", async function () {
                let insUsdcBalanceBefore = (await usdc.balanceOf(insurance.address));
                let insOvnBalanceBefore = (await asset.balanceOf(insurance.address));
                let accountUsdcBalanceBefore = (await usdc.balanceOf(account.address));
                console.log("usdc balance", insUsdcBalanceBefore.toString());
                console.log("ovn balance", insOvnBalanceBefore.toString());
                console.log("usdc balance", accountUsdcBalanceBefore.toString());

                let neededAmount = await getOdosAmountOut(usdc.address, asset.address, 9500000);
                console.log("neededAmount", neededAmount.toString());
                let swapData = await getOdosSwapData(asset.address, usdc.address, neededAmount);
                console.log(swapData);
                await insurance.compensate(swapData, toE6(9), account.address);

                let insUsdcBalanceAfter = (await usdc.balanceOf(insurance.address));
                let insOvnBalanceAfter = (await asset.balanceOf(insurance.address));
                let accountUsdcBalanceAfter = (await usdc.balanceOf(account.address));
                console.log("usdc balance", insUsdcBalanceAfter.toString());
                console.log("ovn balance", insOvnBalanceAfter.toString());
                console.log("usdc balance", accountUsdcBalanceAfter.toString());
                expect(toE6(9)).to.equal(accountUsdcBalanceAfter - accountUsdcBalanceBefore);
            })
        });

    });

});


