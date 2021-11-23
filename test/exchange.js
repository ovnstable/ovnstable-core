const {expect} = require("chai");
const chai = require("chai");
const {deployments, ethers, getNamedAccounts} = require('hardhat');
const {FakeContract, smock} = require("@defi-wonderland/smock");

const fs = require("fs");
let assets = JSON.parse(fs.readFileSync('./assets.json'));

chai.use(smock.matchers);

describe("Exchange", function () {


    let exchange;
    let ovn;
    let usdc;
    let account;
    let pm;
    let m2m;

    before(async () => {
        await deployments.fixture(['Mark2Market', 'PortfolioManager', 'Exchange', 'OvernightToken', 'SettingExchange', 'SettingOvn', 'BuyUsdc']);

        const {deployer} = await getNamedAccounts();
        account = deployer;
        exchange = await ethers.getContract("Exchange");
        ovn = await ethers.getContract("OvernightToken");
        pm = await ethers.getContract("PortfolioManager");
        m2m = await ethers.getContract("Mark2Market");
        usdc = await ethers.getContractAt("ERC20", assets.usdc);

        const pmMock = await smock.fake(pm);
        exchange.setAddr(pmMock.address, m2m.address)
    });

    it("Mint OVN", async function () {


        const sum = 100 * 10 ** 6;
        await usdc.approve(exchange.address, sum);

        console.log("USDC: " + assets.usdc)
        await exchange.buy(assets.usdc, sum);

        let balance = await ovn.balanceOf(account) / 10 ** 6;
        console.log('Balance ovn: ' + balance)
        expect(balance).to.equal(99.96);

    });


    it("Redeem OVN", async function () {

        const sum = 50.6 * 10 ** 6;
        await ovn.approve(exchange.address, sum);
        await exchange.redeem(assets.usdc, sum);

        let balance = await ovn.balanceOf(account) / 10 ** 6;
        console.log('Balance ovn: ' + balance)
        expect(balance).to.equal(49.36);

    });
});
