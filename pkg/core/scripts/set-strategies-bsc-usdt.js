const {getContract, changeWeightsAndBalance, execTimelock, initWallet, convertWeights, showM2M} = require("@overnight-contracts/common/utils/script-utils");
const {createProposal} = require("@overnight-contracts/common/utils/governance");

async function main() {

    let weights = [
        {
            "strategy": "",
            "name": "Venus USDT",
            "minWeight": 0,
            "targetWeight": 100,
            "maxWeight": 100,
            "enabled": true,
            "enabledReward": true
        }
    ]

    weights = await convertWeights(weights);

    let pm = await getContract('PortfolioManager');
    await pm.setCashStrategy('');
    await pm.addStrategy('');
    await pm.setStrategyWeights(weights);

    await showM2M();
}



main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });

