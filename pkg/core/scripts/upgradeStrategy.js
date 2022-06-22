const hre = require("hardhat");
const {getContract, getPrice} = require("@overnight-contracts/common/utils/script-utils");
const ethers = hre.ethers;


async function main() {

    let price = await getPrice();

    let governor = await getContract('OvnGovernor', 'polygon');
    let strategy = await getContract('StrategyArrakis', 'polygon');

    let addresses = [];
    let values = [];
    let abis = [];


    addresses.push(strategy.address);
    values.push(0);
    abis.push(strategy.interface.encodeFunctionData('upgradeTo', ['0x2D4f65Ce59a1A149c011184028086A2f4d4F7293']));

    console.log('Creating a proposal...')
    const proposeTx = await governor.proposeExec(
        addresses,
        values,
        abis,
        ethers.utils.id(abis.toString()),
        price
    );
    let tx = await proposeTx.wait();
    const proposalId = tx.events.find((e) => e.event === 'ProposalCreated').args.proposalId;
    console.log('Proposal id ' + proposalId)
}




main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });

