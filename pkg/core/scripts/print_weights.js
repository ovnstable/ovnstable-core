const {getContract} = require("@overnight-contracts/common/utils/script-utils");
const {createProposal} = require("@overnight-contracts/common/utils/governance");

async function main() {

    let pm = await getContract('PortfolioManager');


    let weights = await pm.getAllStrategyWeights();

    let items = [];

    for (let i = 0; i < weights.length; i++) {
        let weight = weights[i];

        let item = {
            "strategy": weight.strategy,
            "name": "-",
            "minWeight": weight.minWeight / 1000,
            "targetWeight": weight.targetWeight / 1000,
            "maxWeight": weight.maxWeight / 1000,
            "enabled": weight.enabled,
            "enabledReward": weight.enabledReward
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

