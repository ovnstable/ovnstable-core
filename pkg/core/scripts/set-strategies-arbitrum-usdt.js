const {getContract, getPrice, showM2M, convertWeights} = require("@overnight-contracts/common/utils/script-utils");
const {createProposal, testProposal} = require("@overnight-contracts/common/utils/governance");
const {Roles} = require("@overnight-contracts/common/utils/roles");
const {Wallets} = require("@overnight-contracts/common/utils/wallets");

async function main() {

    await showM2M();

    let pm = await getContract('PortfolioManager', 'arbitrum_usdt');

    let weights = [
        {
            "strategy": "0xdBaB307F2f19A678F90Ad309C8b34DaD3da8d334",
            "name": "Cash USDT",
            "minWeight": 0,
            "targetWeight": 0,
            "riskFactor": 0,
            "maxWeight": 100,
            "enabled": false,
            "enabledReward": false
        },
        {
            "strategy": "0x4f96B7D5b67da265861e3e6956f475182EB279c4",
            "name": "DForce USDT",
            "minWeight": 0,
            "targetWeight": 100,
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

