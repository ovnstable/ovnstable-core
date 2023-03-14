const {getContract, changeWeightsAndBalance, execTimelock, initWallet, convertWeights, showM2M, getPrice} = require("@overnight-contracts/common/utils/script-utils");
const {createProposal} = require("@overnight-contracts/common/utils/governance");

async function main() {

    let weights = [
        {
            "strategy": "0x82d8F924b71459bAC871A9F0163d73B6a3FBbb10",
            "name": "Aave",
            "minWeight": 0,
            "targetWeight": 100,
            "maxWeight": 100,
            "riskFactor": 0,
            "enabled": true,
            "enabledReward": true
        },

        {
            "strategy": "0x446e79Fd6793c2c3a4C69F112374edB86fe4F82a",
            "name": "GammaPlus",
            "minWeight": 0,
            "targetWeight": 0,
            "maxWeight": 100,
            "riskFactor": 0,
            "enabled": false,
            "enabledReward": false
        },
        {
            "strategy": "0x85e8c510DA139E41225ecb61954417dd2F953681",
            "name": "AlfaPlus",
            "minWeight": 0,
            "targetWeight": 0,
            "maxWeight": 100,
            "riskFactor": 0,
            "enabled": false,
            "enabledReward": false
        },
        {
            "strategy": "0x6AEB3bCe61ecFa874a908C828821b86ed326122d",
            "name": "Eta3",
            "minWeight": 0,
            "targetWeight": 0,
            "maxWeight": 100,
            "riskFactor": 0,
            "enabled": false,
            "enabledReward": false
        },
        {
            "strategy": "0x9b9Ca33295FEd1d077926F35Ab460F92012Ed6A9",
            "name": "Theta",
            "minWeight": 0,
            "targetWeight": 0,
            "maxWeight": 100,
            "riskFactor": 0,
            "enabled": false,
            "enabledReward": false
        },
        {
            "strategy": "0x53D0159423F8AaC1e87bF5715A6171d14ee97B50",
            "name": "ZetaPlus [Old]",
            "minWeight": 0,
            "targetWeight": 0,
            "maxWeight": 100,
            "riskFactor": 0,
            "enabled": false,
            "enabledReward": false
        },
        {
            "strategy": "0x1900dce87E6629cb4763F426e613aF408dDdb10c",
            "name": "EpsilonPlus [Old]",
            "minWeight": 0,
            "targetWeight": 0,
            "maxWeight": 100,
            "riskFactor": 0,
            "enabled": false,
            "enabledReward": false
        },
        {
            "strategy": "0xA0C1694179695B50b18b4C25373143a334FaFbed",
            "name": "ZetaPlus",
            "minWeight": 0,
            "targetWeight": 0,
            "maxWeight": 100,
            "riskFactor": 0,
            "enabled": false,
            "enabledReward": false
        },
        {
            "strategy": "0x85542c788BA3288f3b5873C83Ca5d72D97d25D00",
            "name": "EpsilonPlus",
            "minWeight": 0,
            "targetWeight": 0,
            "maxWeight": 100,
            "riskFactor": 0,
            "enabled": false,
            "enabledReward": false
        }
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

