const {expect} = require("chai");
const {deployments, ethers, getNamedAccounts} = require('hardhat');
const {toE6, fromE6, toE18, fromE18} = require("@overnight-contracts/common/utils/decimals");
const hre = require("hardhat");
const {resetHardhat, createRandomWallet} = require("@overnight-contracts/common/utils/tests");
const expectRevert = require("@overnight-contracts/common/utils/expectRevert");
const {evmCheckpoint, evmRestore, sharedBeforeEach} = require("@overnight-contracts/common/utils/sharedBeforeEach")
let {DEFAULT} = require('@overnight-contracts/common/utils/assets');
const chai = require("chai");
chai.use(require('chai-bignumber')());
const {ZERO_ADDRESS} = require("@openzeppelin/test-helpers/src/constants");


describe("Exchange", function () {

    let account;
    let exchange;
    let pm;
    let usdPlus;
    let insurance;
    let testAccount;
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
        testAccount = await createRandomWallet();

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


        it("revert: OracleLoss", async function () {

            await mint(100);
            await pm.withdraw(asset.address, toAsset(1));
            await exchange.setOracleLoss(5000, 100000); // 5%

            await expectRevert(exchange.payout(), 'OracleLoss');
        });

        it("compensate", async function () {

            await mint(100);
            await pm.withdraw(asset.address, toAsset(1));

            await asset.mint(insurance.address, toAsset(10));

            await exchange.setOracleLoss(0, 100000);
            await exchange.setCompensateLoss(1000, 100000); // 1%
            let tx = await (await exchange.payout()).wait();

            expect(101).to.equal(fromAsset(await asset.balanceOf(pm.address)));
            expect(101).to.equal(fromRebase(await usdPlus.totalSupply()));
            expect('1010000000000000000000000000').to.equal(await usdPlus.liquidityIndex());

            let event = tx.events.find((e)=>e.event === 'PayoutEvent');

            expect(1).to.equal(fromRebase(event.args[0]));
            expect('1010000000000000000000000000').to.equal(event.args[1]);
            expect(0).to.equal(fromRebase(event.args[2]));
        });
    });

    describe('Payout: Positive', function () {


        it("revert: profitRecipient address is zero", async function () {

            await mint(100);
            await asset.mint(pm.address, toAsset(1));
            await expectRevert(exchange.payout(), 'profitRecipient address is zero');

        });

        it("premium", async function () {

            await mint(100);
            await asset.mint(pm.address, toAsset(10));

            await exchange.setProfitRecipient(testAccount.address);
            await exchange.setAbroad(0, 5000350);

            await pm.setTotalRiskFactor(10000); // 10%

            let tx = await (await exchange.payout()).wait();

            expect(1).to.equal(fromAsset(await asset.balanceOf(insurance.address)));
            expect(109).to.equal(fromAsset(await asset.balanceOf(pm.address)));
            expect(109).to.equal(fromRebase(await usdPlus.totalSupply()));
            expect('1090000000000000000000000000').to.equal(await usdPlus.liquidityIndex());

            let event = tx.events.find((e)=>e.event === 'PayoutEvent');

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


            let tx = await (await exchange.payout()).wait();

            expect(0).to.equal(fromAsset(await asset.balanceOf(insurance.address)));
            expect(110).to.equal(fromAsset(await asset.balanceOf(pm.address)));
            expect(9.965).to.equal(fromRebase(await usdPlus.balanceOf(testAccount.address)));
            expect(110).to.equal(fromRebase(await usdPlus.totalSupply()));

            expect('1000350004278315086479393931').to.equal(await usdPlus.liquidityIndex());

            let event = tx.events.find((e)=>e.event === 'PayoutEvent');

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

            let tx = await (await exchange.payout()).wait();

            expect(5).to.equal(fromAsset(await asset.balanceOf(insurance.address)));
            expect(105).to.equal(fromAsset(await asset.balanceOf(pm.address)));
            expect(4.965).to.equal(fromRebase(await usdPlus.balanceOf(testAccount.address)));
            expect(105).to.equal(fromRebase(await usdPlus.totalSupply()));

            expect('1000349998646669358973720167').to.equal(await usdPlus.liquidityIndex());

            let event = tx.events.find((e)=>e.event === 'PayoutEvent');

            expect(0.036737).to.equal(fromRebase(event.args[0]));
            expect('1000349998646669358973720167').to.equal(event.args[1]);
            expect(4.963263).to.equal(fromRebase(event.args[2]));
        });
    });

    async function mint(sum) {
        sum = toAsset(sum);

        await asset.mint(account, sum);
        await asset.approve(exchange.address, sum);
        return await exchange.buy(asset.address, sum);
    }

});
