const {expect} = require("chai");
const {deployments, ethers, getNamedAccounts } = require('hardhat');
const fs = require("fs");
let assets = JSON.parse(fs.readFileSync('./assets.json'));



describe("Exchange", function () {


    let exchange;
    let ovn;
    let usdc;
    let account;

    before(async () => {
        await deployments.fixture(['Exchange', 'OvernightToken', 'SettingExchange']);

        const { deployer } = await getNamedAccounts();
        account = deployer;
        exchange = await ethers.getContract("Exchange");
        ovn = await ethers.getContract("OvernightToken");
        usdc = await ethers.getContractAt("ERC20", assets.usdc);

        exchange.setTokens(ovn.address, usdc.address)

    });

    it("Mint OVN", async function () {


        const sum = 100 * 10 ** 6;
        await usdc.approve(exchange.address, sum);

        console.log("USDC: " + assets.usdc)
        await exchange.buy(assets.usdc, sum);

        let balance = await ovn.balanceOf(account);
        console.log('Balance ovn: ' + balance / 10**6)
        expect(balance).to.equal(99960000);

    });


    it("Redeem OVN", async function () {

        const sum = 50.6 * 10 ** 6;
        await ovn.approve(exchange.address, sum);
        await exchange.redeem(assets.usdc, sum);

        let balance = await ovn.balanceOf(account);
        console.log('Balance ovn: ' + balance / 10**6)
        expect(balance).to.equal(50);

    });
});
