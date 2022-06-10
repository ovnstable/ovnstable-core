const hre = require("hardhat");
const {getContract, getPrice} = require("@overnight-contracts/common/utils/script-utils");
const ethers = hre.ethers;


async function main() {

    let price = await getPrice();

    let governor = await getContract('OvnGovernor', 'polygon');
    let timelock= await getContract('OvnTimelockController', 'polygon');
    let usdPlus = await getContract('UsdPlusToken', 'polygon');
    let exchange = await getContract('Exchange', 'polygon');

    let addresses = [];
    let values = [];
    let abis = [];

    addresses.push(usdPlus.address);
    values.push(0);
    abis.push(usdPlus.interface.encodeFunctionData('setExchanger', [timelock.address]));

    addresses.push(usdPlus.address);
    values.push(0);
    abis.push(usdPlus.interface.encodeFunctionData('setLiquidityIndex', ['1044829043576279017557229764']));

    addresses.push(exchange.address);
    values.push(0);
    abis.push(exchange.interface.encodeFunctionData('setPayoutTimes', [1637193600, 24 * 60 * 60, 15 * 60]));

    addresses.push(usdPlus.address);
    values.push(0);
    abis.push(usdPlus.interface.encodeFunctionData('setExchanger', [exchange.address]));

    console.log('Creating a proposal...')
    const proposeTx = await governor.proposeExec(
        addresses,
        values,
        abis,
        ethers.utils.id("Proposal 2: Upgrade Strategies"),
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

