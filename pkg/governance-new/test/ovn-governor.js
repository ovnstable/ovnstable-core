const {expect} = require("chai");
const {deployments, ethers, getNamedAccounts} = require('hardhat');
const expectRevert = require("@overnight-contracts/common/utils/expectRevert");

const hre = require("hardhat");

const {fromE18, toE18} = require("@overnight-contracts/common/utils/decimals");
const chai = require("chai");
chai.use(require('chai-bignumber')());
const {solidity} = require("ethereum-waffle");
chai.use(solidity);
let againstVotes = 0;
let forVotes = 1;
let abstainVotes = 2;

const proposalStates = ['Pending', 'Active', 'Canceled', 'Defeated', 'Succeeded', 'Queued', 'Expired', 'Executed'];

const State = {
    PENDING: "Pending",
    ACTIVE: "Active",
    CANCELED: "Canceled",
    DEFEATED: "Defeated",
    SUCCEEDED: "Succeeded",
    QUEUED: "Queued",
    EXPIRED: "Expired",
    EXECUTED: "Executed",
}

const GOVERNOR_ABI = require("./abi/GOVERNOR_ABI.json");
const {sharedBeforeEach} = require("@overnight-contracts/common/utils/sharedBeforeEach");
describe("OvnGovernor", function () {


    let ovnToken;

    let account;
    let user;

    let governator;
    let timeLock;
    let exchange;
    let waitBlock = 50;

    sharedBeforeEach('shareBeforeEach', async () => {
        await hre.run("compile");
        await deployments.fixture(['Ovn', 'OvnGovernor', 'OvnTimelock', 'OvnTimelockSetting']);

        let signers = await ethers.getSigners();
        account = signers[0];
        user = signers[1];

        console.log('Account: ' + account.address)
        console.log('User: ' + user.address)

        ovnToken = await ethers.getContract('Ovn');
        governator = await ethers.getContract('OvnGovernor');
        governator = await ethers.getContractAt(GOVERNOR_ABI, governator.address);

        timeLock = await ethers.getContract('OvnTimelock');

        await ovnToken.mint(account.address, toE18(100));
        await ovnToken.mint(user.address, toE18(10));

        await ovnToken.delegate(account.address)
        await ovnToken.connect(user).delegate(user.address);


        await deployments.deploy('MockContract', {
            from: account.address,
            args: [],
            log: true,
        });

        exchange = await ethers.getContract('MockContract')

        await ovnToken.grantRole(await ovnToken.DEFAULT_ADMIN_ROLE(), timeLock.address);

    });


    describe('Settings & Proprieties', () => {

        it("GET Governor settings", async function () {

            let votingDelay = await governator.votingDelay();
            let votingPeriod = await governator.votingPeriod();
            let proposalThreshold = await governator.proposalThreshold();
            let quorumNumerator = await governator.quorumNumerator();

            expect(votingDelay).to.eq(1);
            expect(votingPeriod).to.eq(waitBlock);
            expect(proposalThreshold).to.eq(toE18(10));
            expect(quorumNumerator).to.eq(51);
        });


        it("delegated should be 100", async function () {

            let delegated = fromE18(await ovnToken.getVotes(account.address));
            expect(delegated).to.eq(100);

        });

        it("TotalSupply should be 110", async function () {

            let totalSupply = fromE18(await ovnToken.totalSupply());
            expect(totalSupply).to.eq(110);

        });
    })


    describe('updateQuorumNumerator', () => {

        it("Governor settings: updateQuorumNumerator -> throw only Governance", async function () {
            let msg = 'VM Exception while processing transaction: reverted with reason string \'Governor: onlyGovernance\'';
            await expectRevert(governator.updateQuorumNumerator(5), msg);
        });

    })

    describe('setVotingPeriod', () => {

        it("Change Governor settings -> throw only Governance", async function () {
            let msg = 'VM Exception while processing transaction: reverted with reason string \'Governor: onlyGovernance\'';
            await expectRevert(governator.setVotingPeriod(100), msg);
        });


        it('voting period changed', async ()=>{

            expect(await governator.votingPeriod()).to.eq(50);

            let addresses = [governator.address];
            let values = [0];
            let abis = [governator.interface.encodeFunctionData('setVotingPeriod', [100])];

            await executeProposal(addresses, values, abis);

            expect(await governator.votingPeriod()).to.eq(100);

        })
    })

    describe('setVotingDelay', () => {

        it("Change Governor settings -> throw only Governance", async function () {
            let msg = 'VM Exception while processing transaction: reverted with reason string \'Governor: onlyGovernance\'';
            await expectRevert(governator.setVotingDelay(5), msg);
        });


        it('voting delay changed', async ()=>{

            expect(await governator.votingDelay()).to.eq(1);

            let addresses = [governator.address];
            let values = [0];
            let abis = [governator.interface.encodeFunctionData('setVotingDelay', [50])];

            await executeProposal(addresses, values, abis);

            expect(await governator.votingDelay()).to.eq(50);

        })
    })


    describe('proposal', () => {


        it("Quorum -> success: 51%", async function () {

            let proposalId = await createMockProposal();
            await castForVote(account, proposalId);
            await waitToEnd();
            await stateShould(proposalId, State.SUCCEEDED);

        });

        it("Quorum -> fail: 51%", async function () {

            let proposalId = await createMockProposal();
            await castForVote(user, proposalId);
            await waitToEnd();
            await stateShould(proposalId, State.DEFEATED);
        });


        it("Create propose -> voting -> success -> queue -> executed", async function () {

            await exchange.grantRole(await ovnToken.DEFAULT_ADMIN_ROLE(), timeLock.address);

            let proposalId = await createMockProposal();
            await castForVote(account, proposalId);
            await waitToEnd();

            await queue(proposalId);
            await stateShould(proposalId, State.QUEUED)

            await execute(proposalId);
            await stateShould(proposalId, State.EXECUTED);

            await expect(await exchange.buyFee()).to.eq(25);
        });


        it('execute revert -> cancel', async function (){

            let proposalId = await createMockProposal();
            await castForVote(account, proposalId);
            await waitToEnd();
            await queue(proposalId);

            await expectRevert(governator.execute(proposalId), 'TimelockController: underlying transaction reverted');
            await governator.cancel(proposalId);
            await stateShould(proposalId, State.CANCELED);
        })

        it("Multi calls in propose", async function () {

            await exchange.grantRole(await ovnToken.DEFAULT_ADMIN_ROLE(), timeLock.address);

            let addresses = [exchange.address, exchange.address];
            let values = [0, 0];
            let abis = [exchange.interface.encodeFunctionData('setBuyFee', [25, 100000]),
                exchange.interface.encodeFunctionData('setRedeemFee', [45, 1000000])]

            let proposalId = await proposal(addresses, values, abis);

            await castForVote(account, proposalId);
            await waitToEnd();

            await queue(proposalId);
            await stateShould(proposalId, State.QUEUED)


            await expect(await exchange.buyFee()).to.eq(40);
            await expect(await exchange.redeemFee()).to.eq(40);

            await execute(proposalId);
            await stateShould(proposalId, State.EXECUTED);

            await expect(await exchange.buyFee()).to.eq(25);
            await expect(await exchange.redeemFee()).to.eq(45);
        });


        it("Execute not successful proposal -> revert", async function () {

            let proposalId = await createMockProposal();
            await expectRevert(governator.execute(proposalId), 'Governor: proposal not successful');
        });

        it("Queue not successful proposal -> revert", async function () {
            let proposalId = await createMockProposal();
            await expectRevert(governator.queue(proposalId), 'Governor: proposal not successful');
        });


    })


    describe('cancel', () => {

        it("Only proposer can cancel proposal", async function () {
            let proposalId = await createMockProposal();
            await expectRevert(governator.connect(user).cancel(proposalId), 'GovernorBravo: proposer above threshold');
        });


        it("Cancel proposal", async function () {
            let proposalId = await createMockProposal();

            await governator.cancel(proposalId);
            await stateShould(proposalId, State.CANCELED);
        });

    });


    describe('updateTimelock', () => {

        it("Update timelock -> revert", async function () {
            await expectRevert(governator.connect(user).updateTimelock(user.address), 'Governor: onlyGovernance');
            await expectRevert(governator.updateTimelock(user.address), 'Governor: onlyGovernance');
        });

        it("Update timelock -> success", async function () {

            expect(user.address).not.equal(await governator.timelock());

            let addresses = [governator.address];
            let values = [0];
            let abis = [governator.interface.encodeFunctionData('updateTimelock', [user.address])];

            await executeProposal(addresses, values, abis);

            expect(user.address).to.equal(await governator.timelock());
        });
    })


    async function executeProposal(addresses, values, abis) {

        let proposalId = await proposal(addresses, values, abis);

        await castForVote(account, proposalId);
        await waitToEnd();

        await queue(proposalId);
        await execute(proposalId);
    }


    async function createMockProposal() {
        const tx = await (await governator.propose(
            [exchange.address],
            [0],
            [exchange.interface.encodeFunctionData('setBuyFee', [25, 100000])],
            "Test propose",
        )).wait();

        await ethers.provider.send('evm_mine'); // wait 1 block before opening voting

        return tx.events.find((e) => e.event == 'ProposalCreated').args.proposalId;
    }


    async function stateShould(proposalId, state) {
        let currentState = proposalStates[await governator.state(proposalId)];
        expect(currentState).to.eq(state)
    }


    async function queue(proposalId) {
        await ethers.provider.send('evm_mine'); // wait 1 block before opening voting
        await governator.queue(proposalId);
    }

    async function execute(proposalId) {
        await ethers.provider.send('evm_mine'); // wait 1 block before opening voting
        await governator.execute(proposalId);
    }

    async function castForVote(user, proposalId) {
        await governator.connect(user).castVote(proposalId, forVotes);
    }

    async function proposal(addresses, values, abis) {

        const tx = await (await governator.propose(
            addresses,
            values,
            abis,
            "Proposal #4: Multi proposals",
        )).wait();
        await ethers.provider.send('evm_mine');
        return tx.events.find((e) => e.event == 'ProposalCreated').args.proposalId;
    }

    async function waitToEnd() {

        const sevenDays = 7 * 24 * 60 * 60;
        for (let i = 0; i < waitBlock; i++) {
            await ethers.provider.send("evm_increaseTime", [sevenDays])
            await ethers.provider.send('evm_mine'); // wait 1 block before opening voting
        }
    }
});


