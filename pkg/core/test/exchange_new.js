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
    let insurance;
    let asset;

    let toAsset = function () {
    };
    let fromAsset = function () {
    };

    let fromRebase = function (){

    };
    let toRebase = function (){

    };


    sharedBeforeEach("deploy contracts", async () => {
        // need to run inside IDEA via node script running
        await hre.run("compile");
        await resetHardhat(process.env.STAND);

        await deployments.fixture(['TestExchange']);

        const {deployer} = await getNamedAccounts();
        account = deployer;
        exchange = await ethers.getContract("Exchange");

        usdPlus = await ethers.getContract("UsdPlusToken");
        pm = await ethers.getContract('MockPortfolioManager');
        insurance = await ethers.getContract('MockInsuranceExchange');
        asset = await ethers.getContract('AssetToken');

        let decimal = {
            rebase: 6,
            asset: 18
        }

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
    });

    describe('Payout: Negative', function () {


        it("revert: Delta abroad:min", async function () {

            await mint(100);
            await pm.withdraw(asset.address, toAsset(1));
            await exchange.setOracleLoss(5000, 100000); //5%

            await expectRevert(exchange.payout(), 'Delta abroad:min');
        });

        it("getInsurance", async function () {

            await mint(100);
            await pm.withdraw(asset.address, toAsset(1));

            await asset.mint(insurance.address, toAsset(10));

            await exchange.setOracleLoss(0, 100000);
            await exchange.setModifierLoss(1000, 100000);
            await exchange.payout();

        });
    });

    async function mint(sum) {
        sum = toAsset(sum);

        await asset.mint(account, sum);
        await asset.approve(exchange.address, sum);
        return await exchange.buy(asset.address, sum);
    }

});
