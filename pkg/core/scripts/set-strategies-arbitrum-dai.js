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
            "strategy": "0x6389D1F4B50f06c19a63A8F80BC67804F5D77E5d",
            "name": "Aave",
            "minWeight": 0,
            "targetWeight": 2.5,
            "riskFactor": 0,
            "maxWeight": 100,
            "enabled": true,
            "enabledReward": true
        },
        {
            "strategy": "0x0F4588ea1094663529Dd6e9f846e6F874A95521C",
            "name": "ETS Alpha",
            "minWeight": 0,
            "targetWeight": 35,
            "riskFactor": 0,
            "maxWeight": 100,
            "enabled": true,
            "enabledReward": false
        },
    ]


    weights = await convertWeights(weights);

    await showM2M();

    let pm = await getContract('PortfolioManager');
    await (await pm.addStrategy('0xE93A09f8DFf244E024D09027303fb3E704c8FdAD')).wait();
    await (await pm.addStrategy('0x908080Ed6b88D6A1a80593dbE0FC2064d38ef78f')).wait();
    await (await pm.addStrategy('0x0F4588ea1094663529Dd6e9f846e6F874A95521C')).wait();
    await (await pm.setStrategyWeights(weights)).wait();
    await (await pm.balance()).wait();

    await showM2M();

    // await changeWeightsAndBalance(weights);

}


main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });

