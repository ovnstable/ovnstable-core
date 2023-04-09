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
            "strategy": "0x0A41ffF992f04e1610C8e5B32bb72B2878270381",
            "name": "Aave",
            "minWeight": 0,
            "targetWeight": 2.5,
            "riskFactor": 0,
            "maxWeight": 100,
            "enabled": true,
            "enabledReward": false
        },
        {
            "strategy": "0xd05c15AA8D3E8AEb9833826AbC6C5C591C762D9d",
            "name": "USD+",
            "minWeight": 0,
            "targetWeight": 37.5,
            "riskFactor": 0,
            "maxWeight": 100,
            "enabled": false,
            "enabledReward": false
        },
        {
            "strategy": "0xC267Db15A7d92a417c2eF3e8129A8A40cEb542a6",
            "name": "Wombat DAI",
            "minWeight": 0,
            "targetWeight": 5,
            "riskFactor": 0,
            "maxWeight": 100,
            "enabled": false,
            "enabledReward": true
        },
        {
            "strategy": "0x11f7df23d4eA6Ce39Dc6DEB08A3D39B226EA73dB",
            "name": "Magpie DAI",
            "minWeight": 0,
            "targetWeight": 55,
            "riskFactor": 0,
            "maxWeight": 100,
            "enabled": true,
            "enabledReward": true
        },
    ]


    weights = await convertWeights(weights);

    await showM2M();

    let pm = await getContract('PortfolioManager');
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

