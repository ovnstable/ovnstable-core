const {getContract, getPrice, showM2M, convertWeights} = require("@overnight-contracts/common/utils/script-utils");
const {createProposal, testProposal} = require("@overnight-contracts/common/utils/governance");
const {Roles} = require("@overnight-contracts/common/utils/roles");
const {Wallets} = require("@overnight-contracts/common/utils/wallets");

async function main() {

    await showM2M();

    let pm = await getContract('PortfolioManager', 'arbitrum_eth');

    let weights = [
        {
            "strategy": "0x4973d06A64640fe8a288D1E28aa17881FF333A48",
            "name": "Aave ETH",
            "minWeight": 0,
            "targetWeight": 55,
            "riskFactor": 0,
            "maxWeight": 100,
            "enabled": true,
            "enabledReward": false
        },
        {
            "strategy": "0xec4dFDb8fc443CBaDd95cF08133E954697C2C291",
            "name": "SMM Alpha",
            "minWeight": 0,
            "targetWeight": 45,
            "riskFactor": 0,
            "maxWeight": 100,
            "enabled": true,
            "enabledReward": false
        },

    ]

    weights = await convertWeights(weights);

    await (await pm.setStrategyWeights(weights)).wait();
    console.log("Set strategy weights done");

    let price = await getPrice();

    await (await pm.balance(price)).wait();
    console.log("Balance done");

    await showM2M();
}


main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });

