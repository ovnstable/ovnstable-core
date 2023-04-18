const {initWallet, getContract, getPrice, getWalletAddress} = require("@overnight-contracts/common/utils/script-utils");
const {toE18} = require("@overnight-contracts/common/utils/decimals");
const {createProposal, getProposalState} = require("@overnight-contracts/common/utils/governance");
const hre = require("hardhat");
const ethers= hre.ethers;


async function main() {

    let governor = await getContract('OvnGovernor');
    let ovn = await getContract('OvnToken');


    let proposalId = '3095485306836588715112934588436174991332600067843977704327778626578799607266'

    await getProposalState(proposalId);

    // Delegate ovn tokens
    // await (await ovn.delegate(await getWalletAddress())).wait();
    // console.log('Delegate done');

    // Voting to Accept
    // await (await governor.castVote(proposalId, 1)).wait();
    // console.log('Cast Vote done');

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
