const {expect} = require("chai");
const {deployments, ethers, getNamedAccounts} = require("hardhat");
const BN = require("bn.js");
const {constants} = require('@openzeppelin/test-helpers');
const {ZERO_ADDRESS} = constants;
const hre = require("hardhat");
const expectRevert = require("@overnight-contracts/common/utils/expectRevert");
let {POLYGON} = require('@overnight-contracts/common/utils/assets');
const {sharedBeforeEach} = require("@overnight-contracts/common/utils/sharedBeforeEach");


describe("WrappedUsdPlusRateProvider", function () {

    let account;
    let usdPlus;
    let wrappedUsdPlus;
    let rateProvider;

    sharedBeforeEach('deploy and setup', async () => {
        // need to run inside IDEA via node script running
        await hre.run("compile");

        await deployments.fixture(['MockUsdPlusToken', 'WrappedUsdPlusTokenForTest']);

        const {deployer} = await getNamedAccounts();
        account = deployer;

        usdPlus = await ethers.getContract("MockUsdPlusToken");
        wrappedUsdPlus = await ethers.getContract("WrappedUsdPlusToken");

        await deployments.deploy('WrappedUsdPlusRateProvider', {
            from: deployer,
            args: [wrappedUsdPlus.address],
            log: true,
        });

        rateProvider = await ethers.getContract('WrappedUsdPlusRateProvider');

        await usdPlus.setExchanger(account);
    });


    describe('getRate', async ()=>{

        it("liquidity index 1", async function () {

            let rate = await rateProvider.getRate();

            expect('1000000000000000000').to.eq(rate);
        });

        it("liquidity index 1.5", async function () {
            let usdcAmountToDeposit = 1000000;
            await usdPlus.mint(account, usdcAmountToDeposit);
            
            let newSupply = usdcAmountToDeposit * 1.5;
            await usdPlus.changeSupply(newSupply.toString());

            let rate = await rateProvider.getRate();

            expect('1500000000000000000').to.eq(rate);
        });

        it("liquidity index 1.03", async function () {
            let usdcAmountToDeposit = 1000000;
            await usdPlus.mint(account, usdcAmountToDeposit);
            
            let newSupply = usdcAmountToDeposit + 35000;
            await usdPlus.changeSupply(newSupply.toString());

            let rate = await rateProvider.getRate();
            expect('1035000000000000000').to.eq(rate);
        });

        it("liquidity index 1.115", async function () {
            let usdcAmountToDeposit = 1000000;
            await usdPlus.mint(account, usdcAmountToDeposit);
            
            let newSupply = usdcAmountToDeposit + 111599;
            await usdPlus.changeSupply(newSupply.toString());

            let rate = await rateProvider.getRate();
            expect('1111599000000000000').to.eq(rate);
        });

    });

});




