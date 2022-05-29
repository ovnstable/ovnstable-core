const {changeWeightsAndBalance, getContract, getPrice} = require("@overnight-contracts/common/utils/script-utils");

const hre = require('hardhat');

async function main() {

    let weights = [
        {
            "strategy": "0x5e0d74aCeC01b8cb9623658Fc356304fEB01Aa96",
            "name": "Aave",
            "minWeight": 0,
            "targetWeight": 2.5,
            "maxWeight": 5,
            "enabled": true,
            "enabledReward": true
        },
        {
            "strategy": "0x4F46fdDa6e3BE4bcb1eBDD3c8D5697F6F64ae69b",
            "name": "Arrakis USDC/USDT",
            "minWeight": 0,
            "targetWeight": 27.5,
            "maxWeight": 100,
            "enabled": false,
            "enabledReward": true
        },
        {
            "strategy": "0xaF7800Ee99ABF99986978B0D357E5f6813aF8638",
            "name": "Dodo USDC",
            "minWeight": 0,
            "targetWeight": 28.5,
            "maxWeight": 100,
            "enabled": true,
            "enabledReward": true
        },
        {
            "strategy": "0xbAdd752A7aE393a5e610F4a62436e370Abd31656",
            "name": "MeshSwap USDC",
            "minWeight": 0,
            "targetWeight": 0,
            "maxWeight": 100,
            "enabled": false,
            "enabledReward": false
        },
        {
            "strategy": "0xc2cdF9340E9B736a478E48024Ab00D07739BD9F9",
            "name": "MeshSwap USDC/USDT",
            "minWeight": 0,
            "targetWeight": 5,
            "maxWeight": 100,
            "enabled": true,
            "enabledReward": true
        },
        {
            "strategy": "0xc1Ab7F3C4a0c9b0A1cebEf532953042bfB9ebED5",
            "name": "Tetu USDC",
            "minWeight": 0,
            "targetWeight": 1.5,
            "maxWeight": 100,
            "enabled": true,
            "enabledReward": true
        },

        {
            "strategy": "0x6343F143708Cc3d2130f94a4dd90fC4cD9440393",
            "name": "Dystopia USDC/USDT",
            "minWeight": 0,
            "targetWeight": 35,
            "maxWeight": 100,
            "enabled": true,
            "enabledReward": true
        }
    ]


    weights = weights.map(value => {

        delete value.name
        value.targetWeight = value.targetWeight * 1000;
        value.maxWeight = value.maxWeight * 1000;

        return value;
    })

    // await changeWeightsAndBalance(weights);
    await createProposal(weights);

}


async function createProposal(weights){
    let governor = await getContract('OvnGovernor', 'polygon');
    let pm = await getContract('PortfolioManager', 'polygon');

    let addresses = [];
    let values = [];
    let abis = [];


    addresses.push(pm.address);
    values.push(0);
    abis.push(pm.interface.encodeFunctionData('setStrategyWeights', [weights]));

    addresses.push(pm.address);
    values.push(0);
    abis.push(pm.interface.encodeFunctionData('balance', []));


    console.log('Creating a proposal...')
    const proposeTx = await governor.proposeExec(
        addresses,
        values,
        abis,
        hre.ethers.utils.id("Proposal 2: Upgrade Strategies"),
        await getPrice()
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

