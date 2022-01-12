const {expect} = require("chai");
const chai = require("chai");
const {deployments, ethers, getNamedAccounts} = require('hardhat');
const {smock} = require("@defi-wonderland/smock");
const hre = require("hardhat");
chai.use(smock.matchers);

describe("Setters", function () {

    let account;
    let usdPlusToken;
    let exchange;
    let pm;


    before(async () => {
        await hre.run("compile");

        const {deployer} = await getNamedAccounts();
        account = deployer;
        console.log('Account ' + account);

        usdPlusToken = await ethers.getContract('UsdPlusToken');
        exchange = await ethers.getContract('Exchange');

    });


    it("UsdPlusToken", async function () {

        let result = await usdPlusToken.hasRole(await usdPlusToken.EXCHANGER, exchange.address);
        expect(result).to.be.true;

    });



});
