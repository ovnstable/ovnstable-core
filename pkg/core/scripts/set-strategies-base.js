const {
    getContract,
    changeWeightsAndBalance,
    execTimelock,
    initWallet,
    convertWeights,
    showM2M
} = require("@overnight-contracts/common/utils/script-utils");
const {createProposal} = require("@overnight-contracts/common/utils/governance");
const {POLYGON} = require("@overnight-contracts/common/utils/assets");
const {Roles} = require("@overnight-contracts/common/utils/roles");

async function main() {

    let weights = [{
        "strategy": "0x9c2D323CC3e1b5ad1d386573cF830Dbee23b946a",
        "name": "Cash USDC",
        "minWeight": 0,
        "targetWeight": 100,
        "riskFactor": 0,
        "maxWeight": 100,
        "enabled": true,
        "enabledReward": true
    }]


    weights = await convertWeights(weights);

    let pm = await getContract('PortfolioManager');

    await (await pm.setStrategyWeights(weights)).wait();
    await (await pm.balance()).wait();
}


main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });

