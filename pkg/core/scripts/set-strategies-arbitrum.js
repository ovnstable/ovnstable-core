const {getContract, changeWeightsAndBalance, execTimelock, initWallet, convertWeights, showM2M} = require("@overnight-contracts/common/utils/script-utils");
const {createProposal} = require("@overnight-contracts/common/utils/governance");
const {POLYGON} = require("@overnight-contracts/common/utils/assets");

async function main() {

    let weights = [{
        "strategy": "0x6389D1F4B50f06c19a63A8F80BC67804F5D77E5d",
        "name": "Aave",
        "minWeight": 0,
        "targetWeight": 100,
        "riskFactor": 0,
        "maxWeight": 100,
        "enabled": true,
        "enabledReward": true
    }]


    weights = await convertWeights(weights);

    let pm = await getContract('PortfolioManager');
    // await (await pm.addStrategy('0x6389D1F4B50f06c19a63A8F80BC67804F5D77E5d')).wait();
    // await (await pm.setStrategyWeights(weights)).wait();
    // await (await pm.balance()).wait();

    // await changeWeightsAndBalance(weights);

}



main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });

