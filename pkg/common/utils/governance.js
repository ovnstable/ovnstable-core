const {fromOvnGov} = require("./decimals");
const {expect} = require("chai");
const {getContract, initWallet} = require("./script-utils");
const hre = require('hardhat');

const ethers= hre.ethers;
const proposalStates = ['Pending', 'Active', 'Canceled', 'Defeated', 'Succeeded', 'Queued', 'Expired', 'Executed'];

async function execProposal(id) {

    let wallet = await initWallet(ethers)
    let governator = await getContract('OvnGovernor', 'polygon');
    let ovn = await getContract('OvnToken', 'polygon');

    let quorum = fromOvnGov(await governator.quorum(await ethers.provider.getBlockNumber('polygon') - 1));
    console.log('Quorum: ' + quorum);

    const proposalId = id;

    let votes = ethers.utils.parseUnits("100000100", 9);

    let state = proposalStates[await governator.state(proposalId)];
    if (state === "Executed") {
        return;
    }

    console.log('State status: ' + state)
    await ethers.provider.send('evm_mine'); // wait 1 block before opening voting

    console.log('Votes: ' + votes)
    await governator.castVote(proposalId, 1);

    let item = await governator.proposals(proposalId);
    console.log('Votes for: ' + item.forVotes / 10 ** 18);

    let total = fromOvnGov(await ovn.getVotes(wallet.address));
    console.log('Delegated ' + total)

    let waitBlock = 200;
    const sevenDays = 7 * 24 * 60 * 60;
    for (let i = 0; i < waitBlock; i++) {
        await ethers.provider.send("evm_increaseTime", [sevenDays])
        await ethers.provider.send('evm_mine'); // wait 1 block before opening voting
    }

    state = proposalStates[await governator.state(proposalId)];
    expect(state).to.eq('Succeeded');
    await governator.queueExec(proposalId);
    await ethers.provider.send('evm_mine'); // wait 1 block before opening voting
    await governator.executeExec(proposalId);


    state = proposalStates[await governator.state(proposalId)];
    console.log('State status: ' + state)
    expect(state).to.eq('Executed');
}


module.exports = {
    execProposal: execProposal,
}
