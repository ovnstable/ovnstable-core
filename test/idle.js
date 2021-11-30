const {expect} = require("chai");
const chai = require("chai");
const {deployments, ethers, getNamedAccounts} = require('hardhat');
const {FakeContract, smock} = require("@defi-wonderland/smock");

let decimals = require('../utils/decimals');

const fs = require("fs");
const {fromAmUSDC, toUSDC, fromUSDC, fromWmatic} = require("../utils/decimals");
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

    /*it("Staking USDC -> idleUSDC", async function () {
        const sum = toUSDC(100);
        await usdc.transfer(connectorIDLE.address, sum);
        await connectorIDLE.stake(usdc.address, sum, vault.address);

        let balance = await idleUsdc.balanceOf(vault.address);
        console.log('Balance idleUsdc: ' + balance)
        expect(balance).to.equal(100);
    });*/

    it("UnStaking idleUSDC -> USDC", async function () {
        const sum = toUSDC(100);
        await usdc.transfer(connectorIDLE.address, sum);
        console.log('connectorIDLE.address: ' + connectorIDLE.address)
        console.log('vault.address: ' + vault.address)
        console.log('Balance usdc: ' + usdc.balanceOf(connectorIDLE.address))
        let mintedTokens = await connectorIDLE.stake(usdc.address, sum, vault.address);
        console.log('mintedTokens: ' + mintedTokens)

        let balance = fromAmUSDC(await usdc.balanceOf("0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266"));
        console.log('Balance idleUsdc: ' + balance)
        expect(balance).to.equal(100);

        await connectorIDLE.unstake(usdc.address, sum, vault.address);

        balance = fromUSDC(await usdc.balanceOf(vault.address));
        console.log('Balance usdc: ' + balance)
        expect(balance).to.equal(100);
    });

    /*it("Claiming wMatic", async function () {
        const sum = 100 * 10 ** 6;
        await usdc.transfer(connectorIDLE.address, sum);
        await connectorIDLE.stake(usdc.address, sum, vault.address);

        let balance = fromWmatic(await wMatic.balanceOf(vault.address));
        console.log('Balance wMatic: ' + balance)
        expect(balance).to.equal(0);

        await usdc.transfer(connectorIDLE.address, sum);
        await connectorIDLE.stake(usdc.address, sum, vault.address);

        await rm.claimRewardAave();

        balance = fromWmatic(await wMatic.balanceOf(vault.address));
        console.log('Balance wMatic: ' + balance)
        expect(balance).to.be.above(0);
    });*/

});
