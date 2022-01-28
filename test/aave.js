const {expect} = require("chai");
const chai = require("chai");
const {deployments, ethers, getNamedAccounts} = require('hardhat');
const {FakeContract, smock} = require("@defi-wonderland/smock");

let decimals = require('../utils/decimals');

const fs = require("fs");
const {fromAmUSDC, toUSDC, fromUSDC, fromWmatic} = require("../utils/decimals");
const hre = require("hardhat");
let assets = JSON.parse(fs.readFileSync('./assets.json'));

chai.use(smock.matchers);

describe("Aave", function () {


    let vault;
    let rm;
    let usdc;
    let account;
    let connectorAave;
    let amUsdc;
    let wMatcic;

    beforeEach(async () => {
        await hre.run("compile");

        await deployments.fixture(['PortfolioManager', "Usdc2VimUsdTokenExchange", 'Connectors', "setting-connectors", 'Portfolio', 'Vault', 'SettingVault', 'RewardManager', 'SettingRewardManager', 'BuyUsdc']);

        const {deployer} = await getNamedAccounts();
        account = deployer;
        vault = await ethers.getContract("Vault");
        rm = await ethers.getContract("RewardManager");
        connectorAave = await ethers.getContract("ConnectorAAVE");
        usdc = await ethers.getContractAt("ERC20", assets.usdc);
        amUsdc = await ethers.getContractAt("ERC20", assets.amUsdc);
        wMatcic = await ethers.getContractAt("ERC20", assets.wMatic);

        vault.setPortfolioManager(vault.address);
    });


    it("Stack USDC -> amUSDC", async function () {

        const sum = toUSDC(100);
        await usdc.transfer(connectorAave.address, sum);
        await connectorAave.stake(usdc.address, sum, vault.address);

        let balance = fromAmUSDC(await amUsdc.balanceOf(vault.address));
        console.log('Balance amUsdc: ' + balance)
        expect(balance).to.equal(100);

    });

    it("UnStacking amUSDC -> USDC", async function () {

        const sum = toUSDC(100);
        await usdc.transfer(connectorAave.address, sum);
        await connectorAave.stake(usdc.address, sum, connectorAave.address);

        let balance = fromAmUSDC(await amUsdc.balanceOf(connectorAave.address));
        console.log('Balance amUsdc: ' + balance)
        expect(balance).to.equal(100);

        await connectorAave.unstake(usdc.address, sum, vault.address);

        balance = fromUSDC(await usdc.balanceOf(vault.address));
        console.log('Balance usdc: ' + balance)
        expect(balance).to.equal(100);

    });

    // Rewards Wmatic are over
    /* it("Claiming Wmatic", async function () {

        const sum = 100 * 10 ** 6;
        await usdc.transfer(connectorAave.address, sum);
        await connectorAave.stake(usdc.address, sum, vault.address);

        let balance = fromWmatic(await wMatcic.balanceOf(vault.address));
        console.log('Balance wMatic: ' + balance)
        expect(balance).to.equal(0);

        await usdc.transfer(connectorAave.address, sum);
        await connectorAave.stake(usdc.address, sum, vault.address);

        await rm.claimRewardAave();

        balance = fromWmatic(await wMatcic.balanceOf(vault.address));
        console.log('Balance wMatic: ' + balance)
        expect(balance).to.be.above(0);
    }); */

});
