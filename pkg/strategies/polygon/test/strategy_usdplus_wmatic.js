const {expect} = require("chai");
const {deployments, ethers, getNamedAccounts} = require("hardhat");
const BN = require("bn.js");
const {constants} = require('@openzeppelin/test-helpers');
const {ZERO_ADDRESS} = constants;
const hre = require("hardhat");
const expectRevert = require("@overnight-contracts/common/utils/expectRevert");
let {POLYGON} = require('@overnight-contracts/common/utils/assets');
const {sharedBeforeEach} = require("@overnight-contracts/common/utils/sharedBeforeEach");
const {toUSDC} = require("@overnight-contracts/common/utils/decimals");


describe("StaticUsdPlusToken", function () {

    let account;
    let secondAccount;
    let strategy;
    let usdPlus;
    let usdc;
    let exchange;

    sharedBeforeEach('deploy and setup', async () => {
        // need to run inside IDEA via node script running
        await hre.run("compile");

        await deployments.fixture(['test', 'StrategyUsdPlusWmatic']);

        const {deployer, anotherAccount} = await getNamedAccounts();
        account = deployer;
        secondAccount = anotherAccount;

        strategy = await ethers.getContract("StrategyUsdPlusWmatic");
        exchange = await ethers.getContractAt("IExchange", '0x6B3712943A913EB9A22B71D4210DE6158c519970');
        usdPlus = await ethers.getContractAt("IERC20", '0x236eeC6359fb44CCe8f97E99387aa7F8cd5cdE1f');
        usdc = await ethers.getContractAt("IERC20", POLYGON.usdc);
    });


    it("Mint 100 USD+", async function () {

        console.log('Balance USD+: ' + await usdPlus.balanceOf(account) / 1e6);
        console.log('Balance USDC: ' + await usdc.balanceOf(account) / 1e6);

        await usdc.approve(exchange.address, toUSDC(110));
        await exchange.buy(POLYGON.usdc, toUSDC(110));

        console.log('Balance USD+: ' + await usdPlus.balanceOf(account) / 1e6);
        console.log('Balance USDC: ' + await usdc.balanceOf(account) / 1e6);


        await usdPlus.approve(strategy.address, toUSDC(100));
        await strategy.mint(toUSDC(100));
    });

});




