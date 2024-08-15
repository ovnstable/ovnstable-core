const {
    getContract,
    changeWeightsAndBalance,
    execTimelock,
    initWallet,
    convertWeights,
    showM2M, getWalletAddress
} = require("@overnight-contracts/common/utils/script-utils");
const {createProposal} = require("@overnight-contracts/common/utils/governance");
const {POLYGON} = require("@overnight-contracts/common/utils/assets");
const {Roles} = require("@overnight-contracts/common/utils/roles");

async function main() {

    let weights = [{
        "strategy": "0x744a222750A0681FB2f7167bDD00E2Ba611F89A9",
        "name": "Moonwell USDC",
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

