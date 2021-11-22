const {expect} = require("chai");
const {ethers} = require("hardhat");

const fs = require("fs");
let assets = JSON.parse(fs.readFileSync('./assets.json'));

const { waffle } = require("hardhat");
const { deployContract } = waffle;


describe("Exchange", function () {
    it("Mint OVN", async function () {

        const account = (await ethers.getSigners())[0];
        console.log('Signer ' + account)

        console.log(deployContract)
        const exchanger = await ethers.getContract("Exchanger");
        const ovn = await ethers.getContract("OvernightToken");

        const sum = 100 * 10 ** 6;

        let buy = exchanger.buy(assets.usdc, sum);
        buy.wait();

        let balance = await ovn.balanceOf(account);
        expect(balance).to.equal(10);

    });
});
