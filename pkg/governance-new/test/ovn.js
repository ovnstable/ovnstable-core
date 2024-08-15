const {expect} = require("chai");
const {deployments, ethers, getNamedAccounts} = require('hardhat');
const hre = require("hardhat");
const chai = require("chai");
chai.use(require('chai-bignumber')());
const { solidity } =  require("ethereum-waffle");
chai.use(solidity);
describe("Ovn", function () {


    let ovn;
    let account;
    let ROLE_ADMIN;

    beforeEach(async () => {
        await hre.run("compile");

        await deployments.fixture(['Ovn']);

        const {deployer} = await getNamedAccounts();
        account = deployer;

        ovn = await ethers.getContract('Ovn');
        await ovn.init();
        ROLE_ADMIN = await ovn.DEFAULT_ADMIN_ROLE();
    });

    it("Grant/Revoke ADMIN", async function () {

        expect(await ovn.hasRole(ROLE_ADMIN, account)).to.be.true;

        await ovn.revokeRole(ROLE_ADMIN, account);

        expect(await ovn.hasRole(ROLE_ADMIN, account)).to.be.false;
    });

    it("Mint only Admin", async function () {

        await ovn.revokeRole(ROLE_ADMIN, account)
        try {
            await ovn.mint(account, ethers.utils.parseUnits("100.0", 18));
            expect.fail("Exception not thrown");
        } catch (e) {
            expect(e.message).to.eq('VM Exception while processing transaction: reverted with reason string \'Restricted to admins\'');
        }

    });

    it("Burn only Admin", async function () {

        await ovn.revokeRole(ROLE_ADMIN, account)
        try {
            await ovn.burn(account, ethers.utils.parseUnits("100.0", 18));
            expect.fail("Exception not thrown");
        } catch (e) {
            expect(e.message).to.eq('VM Exception while processing transaction: reverted with reason string \'Restricted to admins\'');
        }

    });


});
