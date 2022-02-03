const {expect} = require("chai");
const chai = require("chai");
const {deployments, ethers, getNamedAccounts} = require('hardhat');
const {FakeContract, smock} = require("@defi-wonderland/smock");

let decimals = require('../utils/decimals');

const fs = require("fs");
const {fromAmUSDC, toUSDC, fromUSDC, fromWmatic, fromOvn, fromE18} = require("../utils/decimals");
const hre = require("hardhat");
let assets = JSON.parse(fs.readFileSync('./assets.json'));
const BN = require('bignumber.js');

chai.use(smock.matchers);

describe("StrategyCurve", function () {

    let account;
    let strategy;
    let usdc;
    let am3CrvGauge;

    before(async () => {
        await hre.run("compile");

        await deployments.fixture(['StrategyCurve', 'StrategyCurveSetting', 'BuyUsdc']);

        const {deployer} = await getNamedAccounts();
        account = deployer;
        usdc = await ethers.getContractAt("ERC20", assets.usdc);
        am3CrvGauge = await ethers.getContractAt("ERC20", assets.am3CRVgauge);
        strategy = await ethers.getContract('StrategyCurve');
    });


    describe("Stack 100 USDC", function () {

        before(async () => {
            await usdc.transfer(strategy.address, toUSDC(100));
            await strategy.stake(usdc.address, toUSDC(100), account);
        });

        it("Balance Am3CrvGauge should be greater than 95", async function () {
            expect(fromE18(await am3CrvGauge.balanceOf(account))).to.greaterThan(95);
        });

        it("NetAssetValue should be 100", async function () {
            let res = await strategy.netAssetValue(account);
            console.log('NetAssetValue ' + JSON.stringify(res))
            expect(fromUSDC(res)).to.equal(100);
        });

        it("liquidationValue should be 100", async function () {
            expect(fromUSDC(await strategy.liquidationValue(account))).to.equal(100);
        });
    });



    it("UnStacking 100$", async function () {

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



});
