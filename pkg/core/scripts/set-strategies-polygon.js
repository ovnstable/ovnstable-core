const {
    changeWeightsAndBalance, getContract, getPrice, showM2M
} = require("@overnight-contracts/common/utils/script-utils");
const {createProposal} = require("@overnight-contracts/common/utils/governance");


async function main() {


    let weights = [
        {
            "strategy": "0x5e0d74aCeC01b8cb9623658Fc356304fEB01Aa96",
            "name": "Aave",
            "minWeight": 0,
            "targetWeight": 2.5,
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
            "strategy": "0xde7d6Ee773A8a44C7a6779B40103e50Cd847EFff",
            "name": "Synapse USDC",
            "minWeight": 0,
            "targetWeight": 57.5,
            "maxWeight": 100,
            "enabled": true,
            "enabledReward": true
        },
        {
            "strategy": "0x8ED7b474cFE7Ef362c32ffa2FB55aF7dC87D6048",
            "name": "Penrose USDC/TUSD",
            "minWeight": 0,
            "targetWeight": 10.2,
            "maxWeight": 100,
            "enabled": false,
            "enabledReward": true
        },

        {
            "strategy": "0xa7625F964C93f8A62DBed06BaFFDAF8C20025d77",
            "name": "ClearPool USDC",
            "minWeight": 0,
            "targetWeight": 29.3,
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
    // await createProposalWeights(weights);
    await setWeights(weights);

}


async function createProposalWeights(weights) {
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

    await createProposal(addresses, values, abis);

}


async function setWeights(weights) {

    console.log('Show m2m before')
    await showM2M();

    let pm = await getContract('PortfolioManager', 'polygon');
    let opts = await getPrice();

    await (await pm.setStrategyWeights(weights, await getPrice())).wait();
    // await (await pm.balance(opts)).wait();

    console.log('Show m2m after')
    await showM2M()

}


main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });

