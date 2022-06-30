const {
    changeWeightsAndBalance, getContract, getPrice
} = require("@overnight-contracts/common/utils/script-utils");


async function main() {


    let weights = [
        {
            "strategy": "0x5e0d74aCeC01b8cb9623658Fc356304fEB01Aa96",
            "name": "Aave",
            "minWeight": 0,
            "targetWeight": 22.5,
            "maxWeight": 100,
            "enabled": true,
            "enabledReward": true
        },
        {
            "strategy": "0xc1Ab7F3C4a0c9b0A1cebEf532953042bfB9ebED5",
            "name": "Tetu USDC",
            "minWeight": 0,
            "targetWeight": 0.5,
            "maxWeight": 100,
            "enabled": true,
            "enabledReward": true
        },
        {
            "strategy": "0x6343F143708Cc3d2130f94a4dd90fC4cD9440393",
            "name": "Dystopia USDC/USDT",
            "minWeight": 0,
            "targetWeight": 35.3,
            "maxWeight": 100,
            "enabled": true,
            "enabledReward": true
        },
        {
            "strategy": "0xb1c1e7190100272cF6109aF722C3c1cfD9259c7a",
            "name": "Dystopia USDC/DAI",
            "minWeight": 0,
            "targetWeight": 41.7,
            "maxWeight": 100,
            "enabled": true,
            "enabledReward": true
        },

    ]


    let totalWeight = 0;
    for (const weight of weights) {
        totalWeight += weight.targetWeight * 1000;
    }
    console.log(`totalWeight: ${totalWeight}`)

    if (totalWeight !== 100000) {
        console.log(`Total weight not 100000`)
        return
    }

    weights = weights.map(value => {

        delete value.name
        value.targetWeight = value.targetWeight * 1000;
        value.maxWeight = value.maxWeight * 1000;

        return value;
    })

    // await changeWeightsAndBalance(weights);
    await createProposal(weights);

}


async function createProposal(weights, weightsNew) {
    let governor = await getContract('OvnGovernor');
    let pm = await getContract('PortfolioManager');

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
        ethers.utils.id(abis.toString()),
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

