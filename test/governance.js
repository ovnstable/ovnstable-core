const {expect} = require("chai");
const chai = require("chai");
const {deployments, ethers, getNamedAccounts} = require('hardhat');
const {FakeContract, smock} = require("@defi-wonderland/smock");

let decimals = require('../utils/decimals');
const hre = require("hardhat");

const fs = require("fs");
const {fromAmUSDC, toUSDC, fromUSDC, fromWmatic} = require("../utils/decimals");
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

    beforeEach(async () => {
        await hre.run("compile");

        await deployments.fixture(['Governance']);

        const {deployer} = await getNamedAccounts();
        account = deployer;
        console.log('Account ' + account)

        govToken = await ethers.getContract('GovToken');
        governator = await ethers.getContract('OvnGovernorBravo');
        timeLock = await ethers.getContract('TimelockController');
    });


    it("Create propose -> voting -> success -> queue -> executed", async function () {

        let votes = ethers.utils.parseUnits("100.0", 18);
        await govToken.mint(account, votes);
        await govToken.delegate(account)

        console.log('proposalThreshold: ' + await governator.proposalThreshold())
        console.log('votes:             ' + await await govToken.getVotes(account))

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

});
