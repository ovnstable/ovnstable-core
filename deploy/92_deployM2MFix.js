const {ethers} = require("hardhat");

const fs = require("fs");
let assets = JSON.parse(fs.readFileSync('./assets.json'));

module.exports = async ({getNamedAccounts, deployments}) => {
    const {deploy} = deployments;
    const {deployer} = await getNamedAccounts();

    const governor = await ethers.getContract("OvnGovernor");
    const exchanger = await ethers.getContract("Exchange");

    let addresses = [];
    let values = [];
    let abis = [];


    addresses.push(exchanger.address);
    values.push(0);
    abis.push(exchanger.interface.encodeFunctionData('setPayoutTimes', [1643353200, 86400, 900]))

    await upgradeTo(addresses, values, abis, 'Exchange', '0xc5998a064A844B29E256201A56b61267741Df0B3');
    await upgradeTo(addresses, values, abis, 'Mark2Market', '0xd9c7788fcd77eabdb3c08f8b4eD500be9E160420');

    console.log('Creating a proposal...')
    const proposeTx = await governor.proposeExec(
        addresses,
        values,
        abis,
        ethers.utils.id("Proposal #12 Upgrade M2M, Exchange"),
    );

    let tx = await proposeTx.wait();
    const proposalId = tx.events.find((e) => e.event == 'ProposalCreated').args.proposalId;
    console.log('Proposal ID ' + proposalId)

};



async function upgradeTo(addresses, values, abis, name, newAddress){

    const contract= await ethers.getContract(name);

    addresses.push(contract.address);
    values.push(0);
    abis.push(contract.interface.encodeFunctionData('upgradeTo', [newAddress]));
}

module.exports.tags = ['deployM2MFix'];


