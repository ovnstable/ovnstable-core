const {expect} = require("chai");
const chai = require("chai");
const {deployments, ethers, getNamedAccounts} = require('hardhat');

const hre = require("hardhat");
const expectRevert = require("@overnight-contracts/common/utils/expectRevert");
const {sharedBeforeEach} = require("@overnight-contracts/common/utils/sharedBeforeEach");
const {ZERO_ADDRESS} = require("@openzeppelin/test-helpers/src/constants");
chai.use(require('chai-bignumber')());

describe("PolygonPayoutListener", function () {

    let account;
    let pl;
    let mockQsSyncPool;

    sharedBeforeEach('deploy', async () => {
        // need to run inside IDEA via node script running
        await hre.run("compile");

        await deployments.fixture(['PolygonPayoutListener']);

        const {deploy} = deployments;
        const {deployer} = await getNamedAccounts();


        mockQsSyncPool = await deploy("MockQsSyncPool", {
            from: deployer,
            args: [],
            log: true,
            skipIfAlreadyDeployed: false
        });

        account = deployer;
        pl = await ethers.getContract("PolygonPayoutListener");
    });


    it("Not exchanger run error", async function () {
        expect(await pl.exchange()).to.eq(ZERO_ADDRESS);
        await expectRevert(pl.payoutDone(), 'Caller is not the EXCHANGER');
    });

    it("Empty run ok", async function () {
        await pl.setExchanger(account);
        expect(await pl.exchange()).to.eq(account);

        expect(await pl.getAllQsSyncPools()).to.empty;

        // just no errors on call
        await pl.payoutDone();
    });


    it("Add and call", async function () {
        await pl.setExchanger(account);
        expect(await pl.exchange()).to.eq(account);

        expect(await pl.getAllQsSyncPools()).to.empty;

        let qsSyncPoolsToSet = [
            mockQsSyncPool.address,
        ]

        // add to empty
        let receiptAdd = await (await pl.setQsSyncPools(qsSyncPoolsToSet)).wait();
        const updatedEvent = receiptAdd.events.find((e) => e.event === 'QsSyncPoolsUpdated');
        expect(updatedEvent.args[0]).to.equals(0);
        expect(updatedEvent.args[1]).to.equals(mockQsSyncPool.address);

        await expectRevert(pl.payoutDone(), 'MockQsSyncPool.sync() called');
    });


    it("Add/remove qs pool", async function () {
        expect(await pl.getAllQsSyncPools()).to.empty;

        let qsPool1 = "0x0000000000000000000000000000000000000001";
        let qsPool2 = "0x0000000000000000000000000000000000000002";
        let qsPool3 = "0x0000000000000000000000000000000000000003";

        let qsSyncPoolsToSet = [
            qsPool1,
        ]

        // event on add
        let receipt = await (await pl.setQsSyncPools(qsSyncPoolsToSet)).wait();
        let event = receipt.events.find((e) => e.event === 'QsSyncPoolsUpdated');
        expect(event.args[0]).to.equals(0);
        expect(event.args[1]).to.equals(qsPool1);

        expect(await pl.getAllQsSyncPools()).to.contains.all.members(qsSyncPoolsToSet);

        // event on removing
        receipt = await (await pl.setQsSyncPools([])).wait();
        event = receipt.events.find((e) => e.event === 'QsSyncPoolsRemoved');
        expect(event.args[0]).to.equals(0);
        expect(event.args[1]).to.equals(qsPool1);

        expect(await pl.getAllQsSyncPools()).to.empty;

        qsSyncPoolsToSet = [
            qsPool1,
            qsPool2,
            qsPool3,
        ]

        await (await pl.setQsSyncPools(qsSyncPoolsToSet)).wait();
        let currentPools = await pl.getAllQsSyncPools();
        expect(currentPools).deep.equals(qsSyncPoolsToSet);


        qsSyncPoolsToSet = [
            qsPool3,
            qsPool2,
        ]

        await (await pl.setQsSyncPools(qsSyncPoolsToSet)).wait();
        currentPools = await pl.getAllQsSyncPools();
        expect(currentPools).deep.equals(qsSyncPoolsToSet);
    });

});
