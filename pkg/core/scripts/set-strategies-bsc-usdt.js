const {getContract, changeWeightsAndBalance, getPrice, convertWeights, showM2M} = require("@overnight-contracts/common/utils/script-utils");
const {createProposal} = require("@overnight-contracts/common/utils/governance");

async function main() {

    let weights = [
        {
            "strategy": "0x56576CE8D41D461E4fEEEe93E2d48c5A26D4E5Ee",
            "name": "Venus USDT",
            "minWeight": 0,
            "targetWeight": 100,
            "riskFactor": 0,
            "maxWeight": 100,
            "enabled": true,
            "enabledReward": true
        }
    ]

    weights = await convertWeights(weights);

    let price = await getPrice();

    let pm = await getContract('PortfolioManager');
    await pm.setCashStrategy('0x56576CE8D41D461E4fEEEe93E2d48c5A26D4E5Ee', price);
    await pm.addStrategy('0x56576CE8D41D461E4fEEEe93E2d48c5A26D4E5Ee', price);
    await pm.setStrategyWeights(weights, price);

    await showM2M();
}



main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });

