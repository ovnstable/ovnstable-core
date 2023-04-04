const {getContract, changeWeightsAndBalance, getPrice, convertWeights, showM2M} = require("@overnight-contracts/common/utils/script-utils");
const {createProposal} = require("@overnight-contracts/common/utils/governance");

async function main() {

    let weights = [
        {
            "strategy": "0x56576CE8D41D461E4fEEEe93E2d48c5A26D4E5Ee",
            "name": "Venus USDT",
            "minWeight": 0,
            "targetWeight": 2.5,
            "riskFactor": 0,
            "maxWeight": 100,
            "enabled": true,
            "enabledReward": true
        },
        {
            "strategy": "0x65b893C30aA358F930496fA278Fc87579b3832c5",
            "name": "ETS ALPHA",
            "minWeight": 0,
            "targetWeight": 25,
            "riskFactor": 0,
            "maxWeight": 100,
            "enabled": true,
            "enabledReward": false
        },
        {
            "strategy": "0x2688B2ACb0C8A8714ACF35b65C882fecF8eeDE0b",
            "name": "USD+ USDT",
            "minWeight": 0,
            "targetWeight": 25,
            "riskFactor": 0,
            "maxWeight": 100,
            "enabled": true,
            "enabledReward": false
        },
        {
            "strategy": "0x3f10898C18B0297531c8bee0ffe44aecd8728425",
            "name": "Wombex USDT",
            "minWeight": 0,
            "targetWeight": 27.5,
            "riskFactor": 0,
            "maxWeight": 100,
            "enabled": true,
            "enabledReward": true
        },
        {
            "strategy": "0x2070a825B8aEb4c7dca076Fb0a7a50F145b3AA77",
            "name": "Ellipsis DotDot USDT",
            "minWeight": 0,
            "targetWeight": 20,
            "riskFactor": 0,
            "maxWeight": 100,
            "enabled": true,
            "enabledReward": true
        }
    ]

    weights = await convertWeights(weights);

    let price = await getPrice();

    await showM2M();

    let pm = await getContract('PortfolioManager');
    await pm.setStrategyWeights(weights, price);
    await pm.balance(price);

    await showM2M();
}



main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });

