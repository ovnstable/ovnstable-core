const {getContract, getPrice, changeWeightsAndBalance} = require("@overnight-contracts/common/utils/script-utils");
const hre = require("hardhat");
const {evmCheckpoint, evmRestore} = require("@overnight-contracts/common/utils/sharedBeforeEach");
const {createProposal} = require("@overnight-contracts/common/utils/governance");

async function main() {

    let weights = [
        {
            "strategy": "0x67C37De5832b063c32b5AaDaa2C9283ED1434C90",
            "name": "Venus Usdt",
            "minWeight": 0,
            "targetWeight": 2.5,
            "maxWeight": 5,
            "enabled": true,
            "enabledReward": true
        },
        {
            "strategy": "0xaaE3A8725bAe9a799C78BCd19b592BC9dbbd7a32",
            "name": "Synapse Usdt",
            "minWeight": 0,
            "targetWeight": 97.5,
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
    // await proposal(weights);
    await setWeights(weights);
}

async function proposal(weights) {
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
    let pm = await getContract('PortfolioManager', 'bsc_usdt');

    await (await pm.setCashStrategy("0x67C37De5832b063c32b5AaDaa2C9283ED1434C90")).wait();
    await (await pm.setStrategyWeights(weights)).wait();
    await (await pm.balance()).wait();
}


main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });

