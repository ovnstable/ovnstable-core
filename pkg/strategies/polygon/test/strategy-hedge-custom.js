const {expect} = require("chai");
const {deployments, ethers, getNamedAccounts} = require("hardhat");
const hre = require("hardhat");
let {POLYGON} = require('@overnight-contracts/common/utils/assets');
const {sharedBeforeEach, evmCheckpoint, evmRestore} = require("@overnight-contracts/common/utils/sharedBeforeEach");
const {toUSDC} = require("@overnight-contracts/common/utils/decimals");
const {fromUSDC} = require("../../../common/utils/decimals");
const {resetHardhat} = require("@overnight-contracts/common/utils/tests");


describe("StrategyUsdPlusWmatic", function () {

    let account;
    let secondAccount;
    let strategy;
    let usdPlus;
    let usdc;
    let exchange;

    sharedBeforeEach('deploy and setup', async () => {


        await evmCheckpoint('test');

        try { // need to run inside IDEA via node script running
            await hre.run("compile");

            await deployments.fixture(['StrategyUsdPlusWmatic']);

            const {deployer, anotherAccount} = await getNamedAccounts();
            account = deployer;
            secondAccount = anotherAccount;

            strategy = await ethers.getContract("StrategyUsdPlusWmatic");
            exchange = await ethers.getContractAt("IExchange", '0x6B3712943A913EB9A22B71D4210DE6158c519970');
            usdPlus = await ethers.getContractAt("IERC20", '0x236eeC6359fb44CCe8f97E99387aa7F8cd5cdE1f');
            usdc = await ethers.getContractAt("IERC20", POLYGON.usdc);

            await strategy.setExchanger(account);

            await usdPlus.transfer(strategy.address, toUSDC(10));
            await strategy.stake(toUSDC(10));

            console.log('Nav ' + fromUSDC(await strategy.netAssetValue()));

            await strategy.unstake(toUSDC(9), account);
            console.log('Nav ' + fromUSDC(await strategy.netAssetValue()));

            await strategy.balance();

        } catch (e) {
            console.log(e)
        }

        await evmRestore('test');

    });


    it("Test1", async function () {

    });


    it("Test2", async function () {

    });

});




