const {getContract, changeWeightsAndBalance, getPrice, convertWeights, showM2M} = require("@overnight-contracts/common/utils/script-utils");
const {createProposal} = require("@overnight-contracts/common/utils/governance");
const {Roles} = require("@overnight-contracts/common/utils/roles");

async function main() {

    let weights = [
        {
            "strategy": "0x65D97BdFD4c1076cD1F95Cbe3B56954277d0956F",
            "minWeight": 0,
            "targetWeight": 100,
            "maxWeight": 100,
            "riskFactor": 0,
            "enabled": true,
            "enabledReward": false
        }
    ]

    weights = await convertWeights(weights);
    console.log(weights);

    await showM2M();

    let pm = await getContract('PortfolioManager');
    let rm = await getContract('RoleManager');

    await (await pm.setStrategyWeights(weights)).wait();

    await showM2M();
}



main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });

