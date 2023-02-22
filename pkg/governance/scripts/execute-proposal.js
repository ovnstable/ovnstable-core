const {initWallet, getContract, getPrice, getWalletAddress} = require("@overnight-contracts/common/utils/script-utils");
const {toE18} = require("@overnight-contracts/common/utils/decimals");
const {createProposal, getProposalState} = require("@overnight-contracts/common/utils/governance");
const hre = require("hardhat");
const ethers= hre.ethers;


async function main() {

    let governor = await getContract('OvnGovernor');
    let ovn = await getContract('OvnToken');


    let proposalId = '109290826049792558952157309030642825444869058500985177636477120700363691372071'

    await getProposalState(proposalId);

    // Delegate ovn tokens
    // await (await ovn.delegate(await getWalletAddress())).wait();

    // Voting to Accept
    await (await governor.castVote(proposalId, 1)).wait();

    // Wait

    // Send to Queue
    // await (await governor.queueExec(proposalId)).wait();

    // await sleep(1_000);

    // Execute
    // await (await governor.executeExec(proposalId)).wait();

    await getProposalState(proposalId);

}

function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
