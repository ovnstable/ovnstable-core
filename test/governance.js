const {expect} = require("chai");
const chai = require("chai");
const {deployments, ethers, getNamedAccounts} = require('hardhat');
const {FakeContract, smock} = require("@defi-wonderland/smock");

let decimals = require('../utils/decimals');
const hre = require("hardhat");

const fs = require("fs");
const {fromAmUSDC, toUSDC, fromUSDC, fromWmatic, fromOvnGov} = require("../utils/decimals");
const {load} = require("dotenv");
let assets = JSON.parse(fs.readFileSync('./assets.json'));

chai.use(smock.matchers);

let againstVotes = 0;
let forVotes = 1;
let abstainVotes = 2;

const proposalStates = ['Pending', 'Active', 'Canceled', 'Defeated', 'Succeeded', 'Queued', 'Expired', 'Executed'];

describe("Governance", function () {


    let govToken;
    let account;
    let governator;
    let timeLock;
    let exchange;

    beforeEach(async () => {
        await hre.run("compile");

        await deployments.fixture(['Governance', 'Exchange']);

        const {deployer} = await getNamedAccounts();
        account = deployer;
        console.log('Account ' + account)

        govToken = await ethers.getContract('GovToken');
        governator = await ethers.getContract('OvnGovernor');
        timeLock = await ethers.getContract('TimelockController');
        exchange = await ethers.getContract('Exchange');

        await govToken.grantRole(await govToken.DEFAULT_ADMIN_ROLE(), timeLock.address);

    });


    it("GET Governor settings", async function () {

        let votingDelay = await governator.votingDelay();
        let votingPeriod = await governator.votingPeriod();
        let proposalThreshold = await governator.proposalThreshold();

        expect(votingDelay).to.eq(1);
        expect(votingPeriod).to.eq(5);
        expect(proposalThreshold).to.eq(0);
    });


    it("Change Governor settings -> throw only Governance", async  function (){

        try {
            await governator.setVotingDelay(5);
            expect.fail("Exception not thrown");
        } catch (e) {
            expect(e.message).to.eq('VM Exception while processing transaction: reverted with reason string \'Governor: onlyGovernance\'');
        }
    });

    it("Overview", async function () {

        let votes = ethers.utils.parseUnits("100.0", 18);
        await govToken.mint(account, votes);

        let totalSupply = fromOvnGov(await govToken.totalSupply());
        expect(totalSupply).to.eq(100);

        await govToken.delegate(account)
        let totalDelegated = fromOvnGov(await govToken.getVotes(account))
        expect(totalDelegated).to.eq(100);

    });


    it("Create propose -> call: proposals", async function () {

        let votes = ethers.utils.parseUnits("100.0", 18);
        await govToken.mint(account, votes);
        await govToken.delegate(account)

        const grant = ethers.utils.parseUnits("500.0", 18);
        const newProposal = {
            grantAmount: grant,
            transferCalldata: govToken.interface.encodeFunctionData('mint', [account, grant]),
            descriptionHash: ethers.utils.id("Proposal #2: Give admin some tokens")
        };

        await governator.proposeExec(
            [govToken.address],
            [0],
            [newProposal.transferCalldata],
            newProposal.descriptionHash,
        );


        let ids = await governator.getProposals();
        expect(ids.length).to.eq(1)
        console.log('ID: ' + ids[0])
    });

    it("Create propose -> voting -> success -> queue -> executed", async function () {

        let votes = ethers.utils.parseUnits("100.0", 18);
        await govToken.mint(account, votes);
        await govToken.delegate(account)

        console.log('proposalThreshold: ' + await governator.proposalThreshold())
        console.log('votes:             ' + await govToken.getVotes(account))

        const grant = ethers.utils.parseUnits("500.0", 18);
        const newProposal = {
            grantAmount: grant,
            transferCalldata: govToken.interface.encodeFunctionData('mint', [account, grant]),
            descriptionHash: ethers.utils.id("Proposal #2: Give admin some tokens")
        };

        const proposeTx = await governator.proposeExec(
            [govToken.address],
            [0],
            [newProposal.transferCalldata],
            newProposal.descriptionHash,
        );

        const tx = await proposeTx.wait();
        await ethers.provider.send('evm_mine'); // wait 1 block before opening voting
        const proposalId = tx.events.find((e) => e.event == 'ProposalCreated').args.proposalId;


        let state = await governator.state(proposalId);
        console.log('State: ' + proposalStates[state])
        console.log('Voting delay: ' + await governator.votingPeriod());


        console.log('ProposalID ' + proposalId)
        await governator.castVote(proposalId, forVotes);

        console.log('Votes: ' + votes)


        const sevenDays = 7 * 24 * 60 * 60;
        for (let i = 0; i < 66; i++) {
            await ethers.provider.send("evm_increaseTime", [sevenDays])
            await ethers.provider.send('evm_mine'); // wait 1 block before opening voting
        }

        state = await governator.state(proposalId);
        console.log('State: ' + proposalStates[state])


        console.log('voteSucceeded: ' + await governator.voteSucceeded(proposalId))
        console.log('quorumReached: ' + await governator.quorumReached(proposalId))

        console.log('Current block:  ' + await ethers.provider.getBlockNumber())
        console.log('Deadline block: ' + await governator.proposalDeadline(proposalId))

        state = await governator.state(proposalId);
        console.log('State: ' + proposalStates[state])

        let proposal = await governator.proposals(proposalId);
        console.log('Proposal: ' + JSON.stringify(proposal))

        await governator.queueExec(proposalId);
        state = await governator.state(proposalId);
        console.log('State: ' + proposalStates[state])


        for (let i = 0; i < 5; i++) {
            await ethers.provider.send("evm_increaseTime", [sevenDays])
            await ethers.provider.send('evm_mine'); // wait 1 block before opening voting
        }

        console.log('before votes:' + await govToken.getVotes(account))
        await governator.executeExec(proposalId);
        console.log('after votes:' + await govToken.getVotes(account))

        let number = await govToken.getVotes(account) / 10 ** 18;
        expect(number).to.eq(600)
    });

    it("Multi calls in propose", async  function () {

        let votes = ethers.utils.parseUnits("100.0", 18);
        await govToken.mint(account, votes);
        await govToken.delegate(account)

        const proposeTx = await governator.proposeExec(
            [exchange.address, exchange.address, govToken.address],
            [0, 0, 0],
            [exchange.interface.encodeFunctionData('setBuyFee', [25, 100000]),
             exchange.interface.encodeFunctionData('setRedeemFee', [45, 1000000]),
             govToken.interface.encodeFunctionData('mint', [account, votes])],
            ethers.utils.id("Proposal #4: Multi proposals"),
        );

        const tx = await proposeTx.wait();
        await ethers.provider.send('evm_mine');
        const proposalId = tx.events.find((e) => e.event == 'ProposalCreated').args.proposalId;

        await governator.castVote(proposalId, forVotes);

        const sevenDays = 7 * 24 * 60 * 60;
        for (let i = 0; i < 66; i++) {
            await ethers.provider.send("evm_increaseTime", [sevenDays])
            await ethers.provider.send('evm_mine'); // wait 1 block before opening voting
        }

        await governator.queueExec(proposalId);

        await exchange.grantRole(await exchange.DEFAULT_ADMIN_ROLE(), timeLock.address);

        await governator.executeExec(proposalId);

        let buyFee = await exchange.buyFee();
        let buyFeeDenominator = await exchange.buyFeeDenominator();

        expect(buyFee).to.eq(25);
        expect(buyFeeDenominator).to.eq(100000);

        let redeemFee = await exchange.redeemFee();
        let redeemFeeDenominator = await exchange.redeemFeeDenominator();

        expect(redeemFee).to.eq(45);
        expect(redeemFeeDenominator).to.eq(1000000);

        let balanceGovToken = fromOvnGov(await govToken.balanceOf(account));
        expect(balanceGovToken).to.eq(200)
    });

    it("Change state contract by Proposal", async function () {

        let votes = ethers.utils.parseUnits("100.0", 18);
        await govToken.mint(account, votes);
        await govToken.delegate(account)

        const proposeTx = await governator.proposeExec(
            [exchange.address],
            [0],
            [exchange.interface.encodeFunctionData('setBuyFee', [25, 100000])],
            ethers.utils.id("Proposal #3: Set Buy fee"),
        );

        const tx = await proposeTx.wait();
        await ethers.provider.send('evm_mine'); // wait 1 block before opening voting
        const proposalId = tx.events.find((e) => e.event == 'ProposalCreated').args.proposalId;

        await governator.castVote(proposalId, forVotes);

        const sevenDays = 7 * 24 * 60 * 60;
        for (let i = 0; i < 66; i++) {
            await ethers.provider.send("evm_increaseTime", [sevenDays])
            await ethers.provider.send('evm_mine'); // wait 1 block before opening voting
        }

        await governator.queueExec(proposalId);

        await exchange.grantRole(await exchange.DEFAULT_ADMIN_ROLE(), timeLock.address);

        await governator.executeExec(proposalId);

        let buyFee = await exchange.buyFee();
        let buyFeeDenominator = await exchange.buyFeeDenominator();

        expect(buyFee).to.eq(25);
        expect(buyFeeDenominator).to.eq(100000);
    });

});
