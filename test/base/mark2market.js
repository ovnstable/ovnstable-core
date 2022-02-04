const {expect} = require("chai");
const chai = require("chai");
const {deployments, ethers, getNamedAccounts} = require('hardhat');
const {FakeContract, smock} = require("@defi-wonderland/smock");

let decimals = require('../utils/decimals');

const fs = require("fs");
const {fromAmUSDC, toUSDC, fromUSDC, fromWmatic, fromOvn, fromE18} = require("../utils/decimals");
const hre = require("hardhat");
let assets = JSON.parse(fs.readFileSync('./assets.json'));

chai.use(smock.matchers);

describe("Mark2Market", function () {


    let vault;
    let rm;
    let usdc;
    let account;
    let connectorAave;
    let amUsdc;
    let wMatcic;
    let m2m;

    beforeEach(async () => {
        await hre.run("compile");

        await deployments.fixture(["base","setting-pm", "setting-m2m", "price-getters", "setting-price-getters", "setting-weights", "BuyUsdc"]);

        const {deployer} = await getNamedAccounts();
        account = deployer;
        vault = await ethers.getContract("Vault");
        m2m = await ethers.getContract("Mark2Market");
        usdc = await ethers.getContractAt("ERC20", assets.usdc);
        amUsdc = await ethers.getContractAt("ERC20", assets.amUsdc);
        wMatcic = await ethers.getContractAt("ERC20", assets.wMatic);

        await usdc.transfer(vault.address, toUSDC(100));

    });


    it("totalNetAssets should be eq 100", async function () {
        let value  = await m2m.totalNetAssets();
        expect(fromE18(value)).to.equal(100);

    });

    it("totalLiquidationAssets should be eq 100", async function () {
        let value  =await m2m.totalLiquidationAssets();
        expect(fromE18(value)).to.equal(100);
    });



});
