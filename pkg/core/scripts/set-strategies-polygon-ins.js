const {getContract, changeWeightsAndBalance, execTimelock, initWallet, convertWeights, showM2M, getPrice} = require("@overnight-contracts/common/utils/script-utils");
const {createProposal} = require("@overnight-contracts/common/utils/governance");

async function main() {

    let weights = [
        {
            "strategy": "0x82d8F924b71459bAC871A9F0163d73B6a3FBbb10",
            "name": "Aave",
            "minWeight": 0,
            "targetWeight": 53,
            "maxWeight": 100,
            "riskFactor": 0,
            "enabled": true,
            "enabledReward": true
        },

        {
            "strategy": "0x446e79Fd6793c2c3a4C69F112374edB86fe4F82a",
            "name": "GammaPlus",
            "minWeight": 0,
            "targetWeight": 2,
            "maxWeight": 100,
            "riskFactor": 0,
            "enabled": true,
            "enabledReward": true
        },
        {
            "strategy": "0x85e8c510DA139E41225ecb61954417dd2F953681",
            "name": "AlfaPlus",
            "minWeight": 0,
            "targetWeight": 45,
            "maxWeight": 100,
            "riskFactor": 0,
            "enabled": true,
            "enabledReward": true
        },
    ]


    weights = await convertWeights(weights);
    await setWeights(weights)

}

async function setWeights(weights) {
    let pm = await getContract('PortfolioManager');

    await showM2M();

    let params = await getPrice();

    await (await pm.setStrategyWeights(weights, params)).wait();
    await (await pm.balance(params)).wait();
    await showM2M();
}


main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });

