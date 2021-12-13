const {expect} = require("chai");
const chai = require("chai");
const {deployments, ethers, getNamedAccounts} = require('hardhat');
const {FakeContract, smock} = require("@defi-wonderland/smock");

const fs = require("fs");
const {toUSDC, fromOvn, toOvn} = require("../utils/decimals");
let assets = JSON.parse(fs.readFileSync('./assets.json'));

chai.use(smock.matchers);

describe("Exchange", function () {


    let exchange;
    let usdPlus;
    let usdc;
    let account;
    let pm;
    let m2m;

    before(async () => {
        await deployments.fixture(['Mark2Market', 'PortfolioManager', 'Exchange', 'UsdPlusToken', 'SettingExchange', 'SettingUsdPlusToken', 'BuyUsdc']);

        const {deployer} = await getNamedAccounts();
        account = deployer;
        exchange = await ethers.getContract("Exchange");
        usdPlus = await ethers.getContract("UsdPlusToken");
        pm = await ethers.getContract("PortfolioManager");
        m2m = await ethers.getContract("Mark2Market");
        usdc = await ethers.getContractAt("ERC20", assets.usdc);

        const pmMock = await smock.fake(pm);
        await exchange.setPortfolioManager(pmMock.address)
    });

    it("Mint OVN", async function () {


        const sum = toUSDC(100);
        await usdc.approve(exchange.address, sum);

        console.log("USDC: " + assets.usdc)
        await exchange.buy(assets.usdc, sum);

        let balance = fromOvn(await usdPlus.balanceOf(account));
        console.log('Balance usdPlus: ' + balance)
        expect(balance).to.equal(99.96);

    });


    it("Redeem OVN", async function () {

        const sum = toOvn(50.6);
        await usdPlus.approve(exchange.address, sum);
        await exchange.redeem(assets.usdc, sum);

        let balance = fromOvn(await usdPlus.balanceOf(account));
        console.log('Balance usdPlus: ' + balance)
        expect(balance).to.equal(49.36);

    });
});
