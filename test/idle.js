const {expect} = require("chai");
const chai = require("chai");
const {deployments, ethers, getNamedAccounts} = require('hardhat');
const {FakeContract, smock} = require("@defi-wonderland/smock");

let decimals = require('../utils/decimals');

const fs = require("fs");
const {fromIdle, toIdle, toUSDC, fromUSDC, fromWmatic} = require("../utils/decimals");
let assets = JSON.parse(fs.readFileSync('./assets.json'));

chai.use(smock.matchers);

describe("Idle", function () {

    let vault;
    let rm;
    let usdc;
    let account;
    let connectorIDLE;
    let idleUsdc;
    let wMatic;

    beforeEach(async () => {
        await deployments.fixture(['PortfolioManager', 'Connectors', 'Vault', 'SettingVault', 'RewardManager', 'SettingRewardManager', 'BuyUsdc']);

        const {deployer} = await getNamedAccounts();
        account = deployer;
        vault = await ethers.getContract("Vault");
        rm = await ethers.getContract("RewardManager");
        connectorIDLE = await ethers.getContract("ConnectorIDLE");
        usdc = await ethers.getContractAt("ERC20", assets.usdc);
        idleUsdc = await ethers.getContractAt("ERC20", assets.idleUsdc);
        wMatic = await ethers.getContractAt("ERC20", assets.wMatic);

        vault.setPortfolioManager(vault.address);
    });

    it("Staking/unstaking USDC", async function () {
        const sum = toUSDC(100);
        await usdc.transfer(connectorIDLE.address, sum);
        let balance = await usdc.balanceOf(connectorIDLE.address);
        console.log('Balance usdc: ' + fromUSDC(balance));
        await connectorIDLE.stake(usdc.address, sum, vault.address);
        balance = await idleUsdc.balanceOf(connectorIDLE.address);
        console.log('Balance idleUsdc: ' + fromIdle(balance));

        await ethers.provider.send("evm_mine", [1649121419]);

        await connectorIDLE.unstake(usdc.address, balance, vault.address);
        balance = await usdc.balanceOf(connectorIDLE.address);
        console.log('Balance usdc: ' + fromUSDC(balance));
        balance = await wMatic.balanceOf(connectorIDLE.address);
        console.log('Balance wMatic: ' + fromWmatic(balance));
        balance = await usdc.balanceOf(vault.address);
        console.log('Balance vault usdc: ' + fromUSDC(balance));
        balance = await wMatic.balanceOf(vault.address);
        console.log('Balance vault wMatic: ' + fromWmatic(balance));
    });

});
