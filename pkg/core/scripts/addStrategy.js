const {getContract, getPrice, showM2M, convertWeights} = require("@overnight-contracts/common/utils/script-utils");
const {createProposal, testProposal} = require("@overnight-contracts/common/utils/governance");
const {Roles} = require("@overnight-contracts/common/utils/roles");
const {Wallets} = require("@overnight-contracts/common/utils/wallets");

async function main() {

    let pm = await getContract('PortfolioManager', 'arbitrum_usdt');
    let strategy = await getContract('StrategyUsdt');

    await (await pm.addStrategy(strategy.address)).wait();
    await (await pm.setCashStrategy(strategy.address)).wait();


    let weights = [
        {
            "strategy": strategy.address,
            "name": "Cash",
            "minWeight": 0,
            "targetWeight": 100,
            "riskFactor": 0,
            "maxWeight": 100,
            "enabled": true,
            "enabledReward": false
        },

    ]

    weights = await convertWeights(weights);

    await (await pm.grantRole(Roles.PORTFOLIO_AGENT_ROLE, Wallets.DEV)).wait();
    await (await pm.setStrategyWeights(weights)).wait();


    console.log("Strategies added");
}


main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });

