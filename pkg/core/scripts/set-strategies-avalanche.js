const {
    getContract
} = require("@overnight-contracts/common/utils/script-utils");

async function main() {


    let weights = [
        {
            "strategy": "0xA2007Ae378d95C7c5Fe9f166DB17307d32cb8893",
            "name": "Aave",
            "minWeight": 0,
            "targetWeight": 100,
            "maxWeight": 100,
            "enabled": true,
            "enabledReward": true
        },
    ]


    weights = weights.map(value => {

        delete value.name
        value.targetWeight = value.targetWeight * 1000;
        value.maxWeight = value.maxWeight * 1000;

        return value;
    })

    // await changeWeightsAndBalance(weights);
    // await createProposal(weights);
    await setWeights(weights);

}

async function setWeights(weights) {
    let pm = await getContract('PortfolioManager', 'avalanche');

    await (await pm.setStrategyWeights(weights)).wait();
    await (await pm.balance()).wait();
}


main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });

