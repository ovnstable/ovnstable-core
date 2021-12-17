const {expect} = require("chai");
const chai = require("chai");
const {deployments, ethers, getNamedAccounts} = require('hardhat');
const {FakeContract, smock} = require("@defi-wonderland/smock");

let decimals = require('../utils/decimals');

const fs = require("fs");
const {fromBpsp, toBpsp, toUSDC, fromUSDC, fromWmatic} = require("../utils/decimals");
const hre = require("hardhat");
let assets = JSON.parse(fs.readFileSync('./assets.json'));

chai.use(smock.matchers);

describe("Balancer", function () {

    let vault;
    let rm;
    let usdc;
    let account;
    let connectorBalancer;
    let bpspTusd;
    let wMatic;

    beforeEach(async () => {
        // need to run inside IDEA via node script running
        await hre.run("compile");

        await deployments.fixture(['Setting','setting','base', 'Connectors', 'Mark2Market', 'PortfolioManager', 'Exchange', 'UsdPlusToken', 'SettingExchange', 'SettingUsdPlusToken', 'BuyUsdc']);

        const {deployer} = await getNamedAccounts();
        account = deployer;
        vault = await ethers.getContract("Vault");
        rm = await ethers.getContract("RewardManager");
        connectorBalancer = await ethers.getContract("ConnectorBalancer");
        usdc = await ethers.getContractAt("ERC20", assets.usdc);
        bpspTusd = await ethers.getContractAt("ERC20", assets.bpspTusd);
        wMatic = await ethers.getContractAt("ERC20", assets.wMatic);

        vault.setPortfolioManager(account);
    });

    //TODO balancer
    it("Staking USDC", async function () {

        const sum = toUSDC(100);
        await usdc.transfer(connectorBalancer.address, sum);
        let balance = fromUSDC(await usdc.balanceOf(connectorBalancer.address));
        console.log('Balance usdc: ' + balance);

        await connectorBalancer.stake(usdc.address, sum, vault.address);
        balance = await bpspTusd.balanceOf(connectorBalancer.address);
        console.log('Balance bpspTusd: ' + balance);
        await connectorBalancer.unstake(bpspTusd.address, balance, vault.address);

//        expect(balance).to.greaterThanOrEqual(98);

    });

    /*it("Unstaking USDC", async function () {

        const sum = toUSDC(100);
        await usdc.transfer(connectorBalancer.address, sum);
        let balance = await usdc.balanceOf(connectorBalancer.address);
        console.log('Balance usdc: ' + fromUSDC(balance));

        await connectorBalancer.stake(usdc.address, sum, vault.address);
        balance = fromBal(await bpspTusd.balanceOf(vault.address));
        console.log('Balance bpspTusd: ' + balance);

        const sevenDays = 7 * 24 * 60 * 60;
        await ethers.provider.send("evm_increaseTime", [sevenDays])
        await ethers.provider.send('evm_mine');

        expect(fromUSDC(await usdc.balanceOf(vault.address))).to.equal(0);
        expect(fromUSDC(await bpspTusd.balanceOf(vault.address))).not.equal(0);

        await vault.transfer(bpspTusd.address, connectorBalancer.address, await bpspTusd.balanceOf(vault.address))

        expect(fromUSDC(await bpspTusd.balanceOf(vault.address))).to.equal(0);

        await connectorBalancer.unstake(usdc.address, (await bpspTusd.balanceOf(connectorBalancer.address)), vault.address);
        balance = fromUSDC(await usdc.balanceOf(vault.address));
        console.log('Balance usdc: ' + balance);

        expect(balance).to.greaterThanOrEqual(100);


    });*/

});
