const {getContract, changeWeightsAndBalance, convertWeights, initWallet} = require("@overnight-contracts/common/utils/script-utils");
const {createProposal} = require("@overnight-contracts/common/utils/governance");

async function main() {

    let weights = [
        {
            "strategy": "0x2E80122B1A095C25Aa5717B2bE8DC1eaFE9C8850",
            "name": "Aave",
            "minWeight": 0,
            "targetWeight": 100,
            "maxWeight": 100,
            "enabled": true,
            "enabledReward": true
        },

    ]


    weights = await convertWeights(weights);

    await changeWeightsAndBalance(weights);
    // await setWeights(weights)
}


async function setWeights(weights) {
    let pm = await getContract('PortfolioManager', 'optimism_dai');

    await (await pm.setStrategyWeights(weights)).wait();
    await (await pm.balance()).wait();
}


main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });

