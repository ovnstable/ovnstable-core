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
            "targetWeight": 4,
            "riskFactor": 0,
            "maxWeight": 100,
            "enabled": true,
            "enabledReward": false
        },
        {
            "strategy": "0xec4dFDb8fc443CBaDd95cF08133E954697C2C291",
            "name": "SMM Alpha",
            "minWeight": 0,
            "targetWeight": 5,
            "riskFactor": 0,
            "maxWeight": 100,
            "enabled": true,
            "enabledReward": false
        },
        {
            "strategy": "0xBf49142B268d505D32464358Fe85f888E95709b8",
            "name": "ETS Omega",
            "minWeight": 0,
            "targetWeight": 90,
            "riskFactor": 0,
            "maxWeight": 100,
            "enabled": true,
            "enabledReward": false
        },
        {
            "strategy": "0xd3Cc82085F34D9C500fcbcDb176Edde17a82335C",
            "name": "Pendle wstEth",
            "minWeight": 0,
            "targetWeight": 1,
            "riskFactor": 0,
            "maxWeight": 100,
            "enabled": true,
            "enabledReward": true
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

