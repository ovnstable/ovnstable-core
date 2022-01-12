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

    let account;
    let vault;
    let rm;
    let connectorMStable;
    let vimUsdPriceGetter;
    let mtaPriceGetter;
    let usdc;
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

        // stake
        await connectorMStable.stake(usdc.address, sum, vault.address);
        balance = await vimUsd.balanceOf(vault.address);
        console.log('Balance vimUsd after stake: ' + fromVimUsd(balance));

        expect(fromUSDC(balance)).to.greaterThan(0);
    });

    it("Unstaking USDC", async function () {
        const sum = toUSDC(100);

        // 1 transaction
        await usdc.transfer(connectorMStable.address, sum);
        let balance = await usdc.balanceOf(connectorMStable.address);
        console.log('Balance usdc: ' + fromUSDC(balance));

        // stake
        await connectorMStable.stake(usdc.address, sum, vault.address);
        balance = await vimUsd.balanceOf(vault.address);
        console.log('Balance vimUsd after stake: ' + fromVimUsd(balance));

        // unstake
        balance = await vimUsd.balanceOf(vault.address);
        await connectorMStable.unstake(usdc.address, balance, vault.address);
        balance = await usdc.balanceOf(vault.address);
        console.log('Balance usdc after unstake: ' + fromUSDC(balance));

        expect(fromUSDC(balance)).to.greaterThan(99);
    });

    it("Unstaking USDC with timeout", async function () {
        const sum = toUSDC(100);

        // 1 transaction
        await usdc.transfer(connectorMStable.address, sum);
        let balance = await usdc.balanceOf(connectorMStable.address);
        console.log('Balance usdc: ' + fromUSDC(balance));

        // stake
        await connectorMStable.stake(usdc.address, sum, vault.address);
        balance = await vimUsd.balanceOf(vault.address);
        console.log('Balance vimUsd after stake: ' + fromVimUsd(balance));

        // wait 365 days
        const days = 365 * 24 * 60 * 60;
        await ethers.provider.send("evm_increaseTime", [days])
        await ethers.provider.send('evm_mine');

        // unstake
        balance = await vimUsd.balanceOf(vault.address);
        await connectorMStable.unstake(usdc.address, balance, vault.address);
        balance = await usdc.balanceOf(vault.address);
        console.log('Balance usdc after unstake: ' + fromUSDC(balance));

        expect(fromUSDC(balance)).to.greaterThan(99);
    });

    it("Unstaking USDC by parts", async function () {
        const sum = toUSDC(100);

        // 1 unstake
        await usdc.transfer(connectorMStable.address, sum);
        let balance = await usdc.balanceOf(connectorMStable.address);
        console.log('Balance usdc: ' + fromUSDC(balance));

        // stake
        await connectorMStable.stake(usdc.address, sum, vault.address);
        balance = await vimUsd.balanceOf(vault.address);
        console.log('Balance vimUsd after stake: ' + fromVimUsd(balance));

        // unstake
        balance = await vimUsd.balanceOf(vault.address);
        await connectorMStable.unstake(usdc.address, balance, vault.address);
        let balanceFinal1 = await usdc.balanceOf(vault.address);
        console.log('Balance usdc after unstake: ' + fromUSDC(balanceFinal1));

        // 5 unstakes
        await vault.transfer(usdc.address, connectorMStable.address, balanceFinal1);
        await usdc.transfer(connectorMStable.address, 100000000 - balanceFinal1);
        balance = await usdc.balanceOf(connectorMStable.address);
        console.log('Balance usdc: ' + fromUSDC(balance));

        // stake
        await connectorMStable.stake(usdc.address, sum, vault.address);
        balance = await vimUsd.balanceOf(vault.address);
        console.log('Balance vimUsd after stake: ' + fromVimUsd(balance));

        let balancePart = BigInt(await vimUsd.balanceOf(vault.address)) / 5n;
        console.log('BalancePart: ' + balancePart);

        // 1 unstake
        await connectorMStable.unstake(usdc.address, balancePart, vault.address);
        balance = await usdc.balanceOf(vault.address);
        console.log('Balance usdc after 1 unstake: ' + fromUSDC(balance));

        // 2 unstake
        await connectorMStable.unstake(usdc.address, balancePart, vault.address);
        balance = await usdc.balanceOf(vault.address);
        console.log('Balance usdc after 2 unstake: ' + fromUSDC(balance));

        // 3 unstake
        await connectorMStable.unstake(usdc.address, balancePart, vault.address);
        balance = await usdc.balanceOf(vault.address);
        console.log('Balance usdc after 3 unstake: ' + fromUSDC(balance));

        // 4 unstake
        await connectorMStable.unstake(usdc.address, balancePart, vault.address);
        balance = await usdc.balanceOf(vault.address);
        console.log('Balance usdc after 4 unstake: ' + fromUSDC(balance));

        // 5 unstake
        balance = await vimUsd.balanceOf(vault.address);
        await connectorMStable.unstake(usdc.address, balance, vault.address);
        balanceFinal2 = await usdc.balanceOf(vault.address);
        console.log('Balance usdc after 5 unstake: ' + fromUSDC(balanceFinal2));

        expect(balanceFinal1).to.equal(balanceFinal2);

        balance = await vimUsd.balanceOf(vault.address);
        console.log('Balance vimUsd after all: ' + fromVimUsd(balance));

        expect(fromVimUsd(balance)).to.lessThan(1);
    });

    it("Claiming rewards", async function () {
        const sum = toUSDC(100);

        // 1 transaction
        await usdc.transfer(connectorMStable.address, sum);
        let balance = await usdc.balanceOf(connectorMStable.address);
        console.log('Balance usdc: ' + fromUSDC(balance));

        // stake
        await connectorMStable.stake(usdc.address, sum, vault.address);
        balance = await vimUsd.balanceOf(vault.address);
        console.log('Balance vimUsd after stake: ' + fromVimUsd(balance));

        // wait 365 days
        const days = 365 * 24 * 60 * 60;
        await ethers.provider.send("evm_increaseTime", [days])
        await ethers.provider.send('evm_mine');

        // claim rewards
        await rm.claimRewardMStable();
        let balanceMta = await mta.balanceOf(vault.address);
        let balanceWMatic = await wMatic.balanceOf(vault.address);
        console.log('Balance mta after claim: ' + fromMta(balanceMta));
        console.log('Balance wMatic after claim: ' + fromWmatic(balanceWMatic));

        expect(fromMta(balanceMta)).to.greaterThan(0);
    });

    it("Get price vimUSD", async function () {
        // vimUsdPriceGetter
        let buyPrice = await vimUsdPriceGetter.getUsdcBuyPrice();
        console.log('BuyPrice vimUsd in usdc: ' + fromUSDC(buyPrice));
        let sellPrice = await vimUsdPriceGetter.getUsdcSellPrice();
        console.log('SellPrice vimUsd in usdc: ' + fromUSDC(sellPrice));

        let percent;
        if (buyPrice > sellPrice) {
            percent = (buyPrice - sellPrice) / sellPrice;
        } else {
            percent = (sellPrice - buyPrice) / buyPrice;
        }

        expect(percent).to.lessThan(20);
    });

    it("Get price MTA", async function () {
        // mtaPriceGetter
        let buyPrice = await mtaPriceGetter.getUsdcBuyPrice();
        console.log('BuyPrice mta in usdc: ' + fromUSDC(buyPrice));
        let sellPrice = await mtaPriceGetter.getUsdcSellPrice();
        console.log('SellPrice mta in usdc: ' + fromUSDC(sellPrice));

        let percent;
        if (buyPrice > sellPrice) {
            percent = (buyPrice - sellPrice) * 100 / sellPrice;
        } else {
            percent = (sellPrice - buyPrice) * 100 / buyPrice;
        }

        expect(percent).to.lessThan(20);
    });
});
