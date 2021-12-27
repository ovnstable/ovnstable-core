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
    let mUsd;
    let imUsd;
    let vimUsd;
    let mta;
    let wMatic;

    beforeEach(async () => {
        // need to run inside IDEA via node script running
        await hre.run("compile");

        await deployments.fixture(['Setting', 'setting', 'base', 'Connectors', 'Mark2Market', 'PortfolioManager', 'Exchange', 'UsdPlusToken', 'SettingExchange', 'SettingUsdPlusToken', 'BuyUsdc']);

        // await deployments.fixture(['PortfolioManager', 'Connectors', 'Vault', 'SettingVault', 'RewardManager', 'SettingRewardManager', 'BuyUsdc']);

        const {deployer} = await getNamedAccounts();
        account = deployer;
        vault = await ethers.getContract("Vault");
        rm = await ethers.getContract("RewardManager");
        connectorMStable = await ethers.getContract("ConnectorMStable");
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
        await usdc.transfer(connectorMStable.address, sum);
        let balance = fromUSDC(await usdc.balanceOf(connectorMStable.address));
        console.log('Balance usdc: ' + balance);

        await connectorMStable.stake(usdc.address, sum, vault.address);
        balance = await vimUsd.balanceOf(connectorMStable.address);
        console.log('Balance vimUsd: ' + fromVimUsd(balance));

        const sevenDays = 7 * 24 * 60 * 60;
        await ethers.provider.send("evm_increaseTime", [sevenDays])
        await ethers.provider.send('evm_mine');

        await connectorMStable.unstake(usdc.address, balance, vault.address);
        balance = fromUSDC(await usdc.balanceOf(connectorMStable.address));
        console.log('Balance usdc: ' + balance);
    });

    /*it("Unstaking USDC", async function () {

        const sum = toUSDC(100);
        await usdc.transfer(connectorIDLE.address, sum);
        let balance = await usdc.balanceOf(connectorIDLE.address);
        console.log('Balance usdc: ' + fromUSDC(balance));

        await connectorIDLE.stake(usdc.address, sum, vault.address);
        balance = fromIdle(await idleUsdc.balanceOf(vault.address));
        console.log('Balance idleUsdc: ' + balance);

        const sevenDays = 7 * 24 * 60 * 60;
        await ethers.provider.send("evm_increaseTime", [sevenDays])
        await ethers.provider.send('evm_mine');

        expect(fromUSDC(await usdc.balanceOf(vault.address))).to.equal(0);
        expect(fromUSDC(await idleUsdc.balanceOf(vault.address))).not.equal(0);

        await vault.transfer(idleUsdc.address, connectorIDLE.address, await idleUsdc.balanceOf(vault.address))

        expect(fromUSDC(await idleUsdc.balanceOf(vault.address))).to.equal(0);

        await connectorIDLE.unstake(usdc.address, (await idleUsdc.balanceOf(connectorIDLE.address)), vault.address);
        balance = fromUSDC(await usdc.balanceOf(vault.address));
        console.log('Balance usdc: ' + balance);

        expect(balance).to.greaterThanOrEqual(100);


    });*/

});
