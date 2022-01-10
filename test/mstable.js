const {expect} = require("chai");
const chai = require("chai");
const {deployments, ethers, getNamedAccounts} = require('hardhat');
const {FakeContract, smock} = require("@defi-wonderland/smock");

let decimals = require('../utils/decimals');

const fs = require("fs");
const {fromVimUsd, toVimUsd, fromMta, toMta, toUSDC, fromUSDC, fromWmatic} = require("../utils/decimals");
const hre = require("hardhat");
let assets = JSON.parse(fs.readFileSync('./assets.json'));

chai.use(smock.matchers);

describe("MStable", function () {

    let vault;
    let rm;
    let usdc;
    let account;
    let connectorMStable;
    let vimUsdPriceGetter;
    let mtaPriceGetter;
    let mUsd;
    let imUsd;
    let vimUsd;
    let mta;
    let wMatic;

    beforeEach(async () => {
        // need to run inside IDEA via node script running
        await hre.run("compile");

        await deployments.fixture(['Setting', 'setting', 'base', 'Connectors', 'Mark2Market', 'PortfolioManager', 'Exchange', 'UsdPlusToken', 'SettingExchange', 'SettingUsdPlusToken', 'BuyUsdc']);

        const {deployer} = await getNamedAccounts();
        account = deployer;
        vault = await ethers.getContract("Vault");
        rm = await ethers.getContract("RewardManager");
        connectorMStable = await ethers.getContract("ConnectorMStable");
        vimUsdPriceGetter = await ethers.getContract("VimUsdPriceGetter");
        mtaPriceGetter = await ethers.getContract("MtaPriceGetter");
        usdc = await ethers.getContractAt("ERC20", assets.usdc);
        mUsd = await ethers.getContractAt("ERC20", assets.mUsd);
        imUsd = await ethers.getContractAt("ERC20", assets.imUsd);
        vimUsd = await ethers.getContractAt("ERC20", assets.vimUsd);
        mta = await ethers.getContractAt("ERC20", assets.mta);
        wMatic = await ethers.getContractAt("ERC20", assets.wMatic);

        vault.setPortfolioManager(account);
    });

    it("Staking USDC", async function () {
        const sum = toUSDC(100);

        // 1 transaction
        await usdc.transfer(connectorMStable.address, sum);
        let balance = await usdc.balanceOf(connectorMStable.address);
        console.log('Balance usdc: ' + fromUSDC(balance));

        await connectorMStable.stake(usdc.address, sum, vault.address);
        balance = await vimUsd.balanceOf(vault.address);
        console.log('Balance vimUsd: ' + fromVimUsd(balance));

//        // 2 transaction
//        await usdc.transfer(connectorMStable.address, sum);
//        balance = await usdc.balanceOf(connectorMStable.address);
//        console.log('Balance usdc: ' + fromUSDC(balance));
//
//        await connectorMStable.stake(usdc.address, sum, vault.address);
//        balance = await vimUsd.balanceOf(vault.address);
//        console.log('Balance vimUsd: ' + fromVimUsd(balance));
//
//        // 3 transaction
//        await usdc.transfer(connectorMStable.address, sum);
//        balance = await usdc.balanceOf(connectorMStable.address);
//        console.log('Balance usdc: ' + fromUSDC(balance));
//
//        await connectorMStable.stake(usdc.address, sum, vault.address);
//        balance = await vimUsd.balanceOf(vault.address);
//        console.log('Balance vimUsd: ' + fromVimUsd(balance));

        // wait 365 days
        const days = 365 * 24 * 60 * 60;
        await ethers.provider.send("evm_increaseTime", [days])
        await ethers.provider.send('evm_mine');

        await rm.claimRewardMStable();
        let balanceMta = await mta.balanceOf(vault.address);
        let balanceWMatic = await wMatic.balanceOf(vault.address);
        console.log('Balance mta: ' + balanceMta);
        console.log('Balance wMatic: ' + balanceWMatic);

        balance = await vimUsd.balanceOf(vault.address);
        await connectorMStable.unstake(usdc.address, balance, vault.address);
        balance = await usdc.balanceOf(vault.address);
        console.log('Balance usdc: ' + fromUSDC(balance));

        let buyPrice = await vimUsdPriceGetter.getUsdcBuyPrice();
        console.log('buyPrice vimUsd in usdc: ' + buyPrice);
        let sellPrice = await vimUsdPriceGetter.getUsdcSellPrice();
        console.log('sellPrice vimUsd in usdc: ' + sellPrice);

        // transfer mta
        vault.transfer(mta.address, mtaPriceGetter.address, balanceMta);
        balance = await mta.balanceOf(mtaPriceGetter.address);
        console.log('Balance mta: ' + fromMta(balance));

        // price getter
//        await mtaPriceGetter.getBalancerPrice(balance);

        // swap tokens
        await mtaPriceGetter.swap(balance, mtaPriceGetter.address);
        balance = await wMatic.balanceOf(mtaPriceGetter.address);
        console.log('Balance wMatic: ' + balance);
//        balance = await usdc.balanceOf(mtaPriceGetter.address);
//        console.log('Balance usdc: ' + balance);
    });

});
