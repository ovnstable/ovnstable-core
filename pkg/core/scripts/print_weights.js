const { getContract, getStrategyMapping } = require("@overnight-contracts/common/utils/script-utils");
const { createProposal } = require("@overnight-contracts/common/utils/governance");

async function main() {

    let pm = await getContract('PortfolioManager');


    let weights = await pm.getAllStrategyWeightsWithNames();


    let items = [];

    for (let i = 0; i < weights.length; i++) {
        let weight = weights[i];


        let item = {
            "strategy": weight.weight.strategy,
            "name": weight.name ? weight.name : 'Not found',
            "minWeight": weight.weight.minWeight / 1000,
            "targetWeight": weight.weight.targetWeight / 1000,
            "riskFactor": weight.weight.riskFactor / 1000,
            "maxWeight": weight.weight.maxWeight / 1000,
            "enabled": weight.weight.enabled,
            "enabledReward": weight.weight.enabledReward
        };

        items.push(item);
    }

    console.log(JSON.stringify(items));
}


main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
