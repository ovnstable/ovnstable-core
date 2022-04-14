const {expect} = require("chai");
const {deployments, ethers, getNamedAccounts} = require('hardhat');
const hre = require("hardhat");
const chai = require("chai");
chai.use(require('chai-bignumber')());
const { solidity } =  require("ethereum-waffle");
chai.use(solidity);
describe("Ovn Token", function () {


    let govToken;
    let account;
    let governator;
    let ROLE_ADMIN;

    beforeEach(async () => {
        await hre.run("compile");

        await deployments.fixture(['OvnToken', 'OvnGovernor']);

        const {deployer} = await getNamedAccounts();
        account = deployer;

        govToken = await ethers.getContract('OvnToken');
        governator = await ethers.getContract('OvnGovernor');
        ROLE_ADMIN = await govToken.DEFAULT_ADMIN_ROLE();
    });

    it("Grant/Revoke ADMIN", async function () {

        expect(await govToken.hasRole(ROLE_ADMIN, account)).to.be.true;
        expect(await govToken.hasRole(ROLE_ADMIN, governator.address)).to.be.false;

        await govToken.grantRole(ROLE_ADMIN, governator.address);
        await govToken.revokeRole(ROLE_ADMIN, account);

        expect(await govToken.hasRole(ROLE_ADMIN, account)).to.be.false;
        expect(await govToken.hasRole(ROLE_ADMIN, governator.address)).to.be.true;
    });

    it("Mint only Admin", async function () {

        await govToken.revokeRole(ROLE_ADMIN, account)
        try {
            await govToken.mint(account, ethers.utils.parseUnits("100.0", 18));
            expect.fail("Exception not thrown");
        } catch (e) {
            expect(e.message).to.eq('VM Exception while processing transaction: reverted with reason string \'Restricted to admins\'');
        }

    });

    it("Burn only Admin", async function () {

        await govToken.revokeRole(ROLE_ADMIN, account)
        try {
            await govToken.burn(account, ethers.utils.parseUnits("100.0", 18));
            expect.fail("Exception not thrown");
        } catch (e) {
            expect(e.message).to.eq('VM Exception while processing transaction: reverted with reason string \'Restricted to admins\'');
        }

    });


});
