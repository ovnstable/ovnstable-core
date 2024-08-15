const {expect} = require("chai");
const chai = require("chai");
const {deployments, ethers, getNamedAccounts} = require('hardhat');
const expectRevert = require("@overnight-contracts/common/utils/expectRevert");

const hre = require("hardhat");
chai.use(require('chai-bignumber')());
const { solidity } =  require("ethereum-waffle");
chai.use(solidity);
let againstVotes = 0;
let forVotes = 1;
let abstainVotes = 2;

const proposalStates = ['Pending', 'Active', 'Canceled', 'Defeated', 'Succeeded', 'Queued', 'Expired', 'Executed'];

describe("OvnTimelock", function () {


    let ovnToken;
    let account;
    let governator;
    let timeLock;
    let exchange;
    let governorRole;
    let user1;
    let waitBlock = 200;

    beforeEach(async () => {
        await hre.run("compile");

        await deployments.fixture(['OvnToken','OvnGovernor']);

        const {deployer } = await getNamedAccounts();
        account = deployer;


        ovnToken = await ethers.getContract('OvnToken');
        governator = await ethers.getContract('OvnGovernor');
        timeLock = await ethers.getContract('OvnTimelockController');

        governorRole = await timeLock.GOVERNOR_ROLE();

        let addresses = await ethers.getSigners();
        user1 = addresses[1];
    });

    it("setGovernor -> revert is missing role", async function () {
        await expectRevert(timeLock.connect(user1).setGovernor(user1.address), 'AccessControl: account 0x70997970c51812dc3a010c7d01b50e0d17dc79c8 is missing role 0x0000000000000000000000000000000000000000000000000000000000000000');
    });

    it("UpdateDelay -> caller must be timelock", async function () {
        await expectRevert(timeLock.connect(user1).updateDelay(1), 'TimelockController: caller must be timelock');
        await expectRevert(timeLock.updateDelay(1), 'TimelockController: caller must be timelock');
    });

    it("Execute governor methods -> revert is missing role", async function () {

        let target = user1.address;
        let value = 0;
        let data = 0;
        let predecessor = ethers.utils.formatBytes32String("12");
        let salt = ethers.utils.formatBytes32String("32");
        let delay = 0;

        let error = `AccessControl: account 0x70997970c51812dc3a010c7d01b50e0d17dc79c8 is missing role 0x7935bd0ae54bc31f548c14dba4d37c5c64b3f8ca900cb468fb8abd54d5894f55`;
        await expectRevert(timeLock.connect(user1).schedule(target, value, data, predecessor, salt, delay), error);

        await expectRevert(timeLock.connect(user1).scheduleBatch([target], [value], [data], predecessor, salt, delay), error);

        await expectRevert(timeLock.connect(user1).execute(target, value, data, predecessor, salt), error);

        await expectRevert(timeLock.connect(user1).executeBatch([target], [value], [data], predecessor, salt), error);

        await expectRevert(timeLock.connect(user1).cancel(predecessor), error);
    });

    it("hasRole(GOVERNOR_ROLE, governor) = true", async function () {
        expect(await timeLock.hasRole(await timeLock.GOVERNOR_ROLE(), governator.address)).to.true;
    });

    it("hasRole(GOVERNOR_ROLE, account) = false", async function () {
        expect(await timeLock.hasRole(await timeLock.GOVERNOR_ROLE(), account)).to.false;
    });



    it("setGovernor -> success", async function () {
        await timeLock.setGovernor(user1.address);

        expect(await timeLock.hasRole(await timeLock.GOVERNOR_ROLE(), user1.address)).to.true;
        expect(await timeLock.hasRole(await timeLock.GOVERNOR_ROLE(), governator.address)).to.false;

        await timeLock.setGovernor(governator.address);

        expect(await timeLock.hasRole(await timeLock.GOVERNOR_ROLE(), user1.address)).to.false;
        expect(await timeLock.hasRole(await timeLock.GOVERNOR_ROLE(), governator.address)).to.true;
    });




});
