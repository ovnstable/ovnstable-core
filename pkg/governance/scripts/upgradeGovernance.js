const hre = require("hardhat");
const fs = require("fs");
const {initWallet, getContract, getPrice} = require("@overnight-contracts/common/utils/script-utils");
const ethers = hre.ethers;



async function main() {


    let price = await getPrice();
    let timelock = await getContract('OvnTimelockController', 'polygon');
    let governor = await getContract('OvnGovernor', 'polygon');

    let addresses = [];
    let values = [];
    let abis = [];

    addresses.push(timelock.address);
    values.push(0);
    abis.push(timelock.interface.encodeFunctionData('upgradeTo', ['0x4cEF1b2568BDf38b90EFFb251805cEE8Ffd77853']));

    console.log('Creating a proposal...')
    const proposeTx = await governor.proposeExec(
        addresses,
        values,
        abis,
        ethers.utils.id("Upgrade timelock"),
        price
    );
    let tx = await proposeTx.wait();
    const proposalId = tx.events.find((e) => e.event == 'ProposalCreated').args.proposalId;
    console.log('Proposal id ' + proposalId)
}




main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });

