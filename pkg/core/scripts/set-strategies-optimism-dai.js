const {getContract, changeWeightsAndBalance, convertWeights, initWallet, getPrice, showM2M, transferETH, execTimelock} = require("@overnight-contracts/common/utils/script-utils");
const {createProposal} = require("@overnight-contracts/common/utils/governance");

async function main() {

    let weights = [
        {
            "strategy": "0x2E80122B1A095C25Aa5717B2bE8DC1eaFE9C8850",
            "name": "Aave",
            "minWeight": 0,
            "targetWeight": 10,
            "maxWeight": 15,
            "enabled": true,
            "enabledReward": true
        },
        {
            "strategy": "0x307418340F5991CD895CA0Fc4Eba04995e9BE861",
            "name": "USD+",
            "minWeight": 0,
            "targetWeight": 90,
            "maxWeight": 100,
            "enabled": true,
            "enabledReward": true
        },
    ]


    weights = await convertWeights(weights);

    // await changeWeightsAndBalance(weights);
   await setWeights(weights)
}


async function setWeights(weights) {
    let pm = await getContract('PortfolioManager');
    let strategy = await getContract('StrategyUsdPlusDai');

    await execTimelock(async (timelock)=>{
      await pm.connect(timelock).grantRole(await pm.PORTFOLIO_AGENT_ROLE(), '0x6D2AEd058bc4B24FAa3397c00f2Af6Bef4849fe6');
      await strategy.connect(timelock).grantRole(await strategy.PORTFOLIO_AGENT_ROLE(), '0x5CB01385d3097b6a189d1ac8BA3364D900666445');
        await (await pm.balance()).wait();

    })

    await showM2M();
    // await (await pm.setStrategyWeights(weights)).wait();
    await (await pm.balance()).wait();
    await showM2M();
}


main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });

