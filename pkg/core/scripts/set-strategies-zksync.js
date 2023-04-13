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

async function main() {

    let weights = [
        {
            "strategy": "0x6fdaF7CEF6518Bf99eE130d651b8625748746176",
            "name": "USDC",
            "minWeight": 0,
            "targetWeight": 40,
            "riskFactor": 0,
            "maxWeight": 100,
            "enabled": true,
            "enabledReward": false
        },
        {
            "strategy": "0x5e3D0275496665514495659217a124d671098663",
            "name": "Nexon",
            "minWeight": 0,
            "targetWeight": 15,
            "riskFactor": 0,
            "maxWeight": 100,
            "enabled": false,
            "enabledReward": false
        },
        {
            "strategy": "0xD0251f1013f916d40144E45878Ac52f6d12cB067",
            "name": "Velocore USDC/USD+",
            "minWeight": 0,
            "targetWeight": 45,
            "riskFactor": 0,
            "maxWeight": 100,
            "enabled": false,
            "enabledReward": true
        },


    ]


    weights = await convertWeights(weights);

    await showM2M();

    let pm = await getContract('PortfolioManager');
    await (await pm.setStrategyWeights(weights)).wait();
    // await (await pm.balance()).wait();

    await showM2M();

    // await changeWeightsAndBalance(weights);

}


main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });

