const {getContract, changeWeightsAndBalance, execTimelock, initWallet, convertWeights, showM2M, getPrice} = require("@overnight-contracts/common/utils/script-utils");
const {createProposal} = require("@overnight-contracts/common/utils/governance");

async function main() {

    let weights = [
        {
            "strategy": "0x82d8F924b71459bAC871A9F0163d73B6a3FBbb10",
            "name": "Aave",
            "minWeight": 0,
            "targetWeight": 10,
            "maxWeight": 15,
            "riskFactor": 0,
            "enabled": true,
            "enabledReward": true
        },
        {
            "strategy": "0xDA31BeD342D68a553Cf8d14231B8784b2A0aEc74",
            "name": "Gamma",
            "minWeight": 0,
            "targetWeight": 45,
            "maxWeight": 100,
            "riskFactor": 0,
            "enabled": true,
            "enabledReward": true
        },
        {
            "strategy": "0xe9c0c12D1e6F47b9338fF5E6Be894Fbbd454c68B",
            "name": "Alfa",
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

