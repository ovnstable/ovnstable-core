const {expect} = require("chai");
const {deployments, ethers, getNamedAccounts} = require('hardhat');
const hre = require("hardhat");
const chai = require("chai");
chai.use(require('chai-bignumber')());
const { solidity } =  require("ethereum-waffle");
const expectRevert = require("@overnight-contracts/common/utils/expectRevert");
chai.use(solidity);

describe("PreOvnToken", function () {


    let token;
    let account;
    let user1;

    beforeEach(async () => {
        await hre.run("compile");

        await deployments.fixture(['PreOvnToken']);

        const {deployer} = await getNamedAccounts();
        account = deployer;

        token = await ethers.getContract('PreOvnToken');

        let addresses = await ethers.getSigners();
        user1 = addresses[1];
    });

    it("Mint -> Burn", async function () {
        await token.mint(account, 100);
        expect(100).to.eq(await token.balanceOf(account));

        await token.burn(account, 100);
        expect(0).to.eq(await token.balanceOf(account));
    });


    it("Mint -> throw: Restricted to admin", async function () {
        await expectRevert(token.connect(user1).mint(user1.address, 100), 'Restricted to admin');
    });



});
