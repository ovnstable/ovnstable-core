const {expect} = require("chai");
const chai = require("chai");
const {deployments, ethers, getNamedAccounts} = require('hardhat');
const {FakeContract, smock} = require("@defi-wonderland/smock");

let decimals = require('../utils/decimals');

const fs = require("fs");
const {fromAmUSDC, toUSDC, fromUSDC, fromWmatic} = require("../utils/decimals");
const {load} = require("dotenv");
let assets = JSON.parse(fs.readFileSync('./assets.json'));

chai.use(smock.matchers);

let againstVotes = 0;
let forVotes = 1;
let abstainVotes=2;

const proposalStates = ['Pending', 'Active', 'Canceled', 'Defeated', 'Succeeded', 'Queued', 'Expired', 'Executed'];

describe("Governance", function () {


    let govToken;
    let account;
    let governator;

    beforeEach(async () => {
        await deployments.fixture(['Governance']);

        const {deployer} = await getNamedAccounts();
        account = deployer;

        govToken = await ethers.getContract('GovToken');
        governator = await ethers.getContract('OvnGovernorBravo');
    });


    // it("Test", async function () {
    //
    //     let tokenAddress = govToken.address;
    //
    //     console.log('Gov token address: ' + tokenAddress)
    //     let transferCalldata = govToken.interface.encodeFunctionData('mint', [account, ethers.BigNumber.from('1000000000000000000000')])
    //
    //
    //     await govToken.mint(account, ethers.BigNumber.from("1000000000000000000000"));
    //     let balanceOf = await govToken.balanceOf(account);
    //
    //     await govToken.delegate(account)
    //     console.log('Balance govToken: ' + balanceOf);
    //     await ethers.provider.send("evm_mine")
    //
    //     let number = await ethers.provider.getBlockNumber();
    //     console.log('Block number: ' + number)
    //     await ethers.provider.send("evm_increaseTime", [3600])
    //     await ethers.provider.send("evm_mine")
    //     await ethers.provider.send("evm_mine")
    //     await ethers.provider.send("evm_mine")
    //
    //     console.log('proposalThreshold: ' + await governator.proposalThreshold())
    //
    //     let votes = await governator.getVotes(account, number);
    //     console.log('Votes: ' + votes)
    //
    //     votes = await govToken.getVotes(account);
    //     console.log('Votes: ' + votes)
    //
    //
    //     let id = await governator.propose([tokenAddress], [0], [transferCalldata], 'Proposal #1: Give grant to team');
    //
    //     let newVar = await id.wait();
    //     balanceOf = await govToken.balanceOf(account);
    //     console.log('Balance govToken: ' + balanceOf);
    //
    //     console.log('ProposeId ' + JSON.stringify(newVar))
    //
    //
    // });

    it("Vote", async function () {

        // Distribute governance tokens
        let votes = ethers.utils.parseUnits("10100.0", 18);
        await govToken.mint(account, votes);
        // await govToken.connect(userA).mint(userA.address, votes);
        // await govToken.connect(userB).mint(userB.address, votes);
        // await govToken.connect(userC).mint(userC.address, votes);

        await govToken.delegate(account)

       console.log('proposalThreshold: ' + await governator.proposalThreshold())
       console.log('votes:             ' + await await govToken.getVotes(account))


// Create new proposal
        const grant = ethers.utils.parseUnits("500.0", 18);
        const newProposal = {
            grantAmount: grant,
            transferCalldata: govToken.interface.encodeFunctionData('mint', [account, grant]),
            descriptionHash: ethers.utils.id("Proposal #2: Give admin some tokens")
        };

        const proposeTx = await governator.propose(
            [govToken.address],
            [0],
            [newProposal.transferCalldata],
            newProposal.descriptionHash,
        );

        const tx = await proposeTx.wait();
        await ethers.provider.send('evm_mine'); // wait 1 block before opening voting
        const proposalId = tx.events.find((e) => e.event == 'ProposalCreated').args.proposalId;


        let state =await governator.state(proposalId);
        console.log('State: ' + proposalStates[state])
        console.log('Voting delay: ' + await governator.votingPeriod());


        console.log('ProposalID ' + proposalId)
        await governator.castVote(proposalId, forVotes);

        votes = await governator.proposalVotes(proposalId);

        console.log('Votes: ' + votes)


        const sevenDays = 7 * 24 * 60 * 60;
        for (let i = 0; i < 66; i++) {
            await ethers.provider.send("evm_increaseTime", [sevenDays])
            await ethers.provider.send('evm_mine'); // wait 1 block before opening voting
        }

        state =await governator.state(proposalId);
        console.log('State: ' + proposalStates[state])


        console.log('voteSucceeded: ' + await governator.voteSucceeded(proposalId))
        console.log('quorumReached: ' + await governator.quorumReached(proposalId))

        console.log('Current block:  ' + await ethers.provider.getBlockNumber())
        console.log('Deadline block: ' + await governator.proposalDeadline(proposalId))

        state =await governator.state(proposalId);
        console.log('State: ' + proposalStates[state])


        await governator.execute(
            [govToken.address],
            [0],
            [newProposal.transferCalldata],
            newProposal.descriptionHash,
        );
    })

});
