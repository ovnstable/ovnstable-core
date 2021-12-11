const {expect} = require("chai");
const chai = require("chai");
const {deployments, ethers, getNamedAccounts} = require('hardhat');
const {smock} = require("@defi-wonderland/smock");
const hre = require("hardhat");
chai.use(smock.matchers);

describe("Permissions", function () {

    let account;
    let timeLock;
    let owner;

    before(async () => {
        await hre.run("compile");
        await deployments.fixture(['base', 'permissions']);

        const {deployer} = await getNamedAccounts();
        account = deployer;
        console.log('Account ' + account)
        timeLock = await ethers.getContract('TimelockController');
        owner = timeLock.address;

    });


    it("OvernightToken", async function () {
        await hasRole(await ethers.getContract("OvernightToken"))
    });

    it("Exchange", async function () {
        await hasRole(await ethers.getContract("Exchange"))
    });

    it("PortfolioManager", async function () {
        await hasRole(await ethers.getContract("PortfolioManager"))
    });

    it("Balancer", async function () {
        await hasRole(await ethers.getContract("Balancer"))
    });

    it("Portfolio", async function () {
        await hasRole(await ethers.getContract("Portfolio"))
    });

    it("RewardManager", async function () {
        await hasRole(await ethers.getContract("RewardManager"))
    });

    it("Vault", async function () {
        await hasRole(await ethers.getContract("Vault"))
    });

    it("Mark2Market", async function () {
        await checkOwner(await ethers.getContract("Mark2Market"))
    });

    it("ConnectorAAVE", async function () {
        await checkOwner(await ethers.getContract("ConnectorAAVE"))
    });

    it("ConnectorCurve", async function () {
        await checkOwner(await ethers.getContract("ConnectorCurve"))
    });

    it("ConnectorIDLE", async function () {
        await checkOwner(await ethers.getContract("ConnectorIDLE"))
    });

    async function hasRole(contract){
        let ADMIN_ROLE = await contract.DEFAULT_ADMIN_ROLE();
        let result = await contract.hasRole(ADMIN_ROLE, owner);
        expect(result).to.true;

        result = await contract.hasRole(ADMIN_ROLE, account);
        expect(result).to.false;

    }

    async function checkOwner(contract){
        let contractOwner = await contract.owner();
        expect(owner).to.eq(contractOwner);

    }

});
