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

        vault.setPortfolioManager(account);
    });



    it("Staking USDC", async function () {

        const sum = toUSDC(100);
        await usdc.transfer(connectorIDLE.address, sum);
        let balance = fromUSDC(await usdc.balanceOf(connectorIDLE.address));
        console.log('Balance usdc: ' + balance);

        await connectorIDLE.stake(usdc.address, sum, vault.address);
        balance = fromIdle(await idleUsdc.balanceOf(vault.address));
        console.log('Balance idleUsdc: ' + balance);

        let fixedBalance = Number.parseFloat(balance).toFixed(0);
        expect(fixedBalance).to.equal('98')

    });

    it("Unstaking USDC", async function () {

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

        let fixedBalance = Number.parseFloat(balance).toFixed(0);
        expect(fixedBalance).to.equal('100')


    });

});
