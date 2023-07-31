const {getContract, changeWeightsAndBalance, execTimelock, initWallet, convertWeights, showM2M, getPrice} = require("@overnight-contracts/common/utils/script-utils");
const {createProposal} = require("@overnight-contracts/common/utils/governance");

async function main() {

    await execTimelock(async (timelock)=>{

        let weights = [
            {
                "strategy": "0xA2007Ae378d95C7c5Fe9f166DB17307d32cb8893",
                "name": "Venus BUSD",
                "minWeight": 0,
                "targetWeight": 0,
                "maxWeight": 100,
                "riskFactor": 0,
                "enabled": false,
                "enabledReward": true
            },
            {
                "strategy": "0x621409Ad21B486eA8688c5608abc904Cd8DB8e9b",
                "name": "Wombex USDC",
                "minWeight": 0,
                "targetWeight": 0,
                "maxWeight": 100,
                "riskFactor": 0,
                "enabled": false,
                "enabledReward": true
            },
            {
                "strategy": "0xFe7f3FEa8972313F859194EE00158798be3ED108",
                "name": "Wombex BUSD",
                "minWeight": 0,
                "targetWeight": 0,
                "maxWeight": 100,
                "riskFactor": 0,
                "enabled": false,
                "enabledReward": true
            },
            {
                "strategy": "0x2EBe7e883DBD37D8Bd228e1883De392031068698",
                "name": "ETS ALPHA",
                "minWeight": 0,
                "targetWeight": 0,
                "maxWeight": 100,
                "riskFactor": 0,
                "enabled": false,
                "enabledReward": false
            },
            {
                "strategy": "0x970D50d09F3a656b43E11B0D45241a84e3a6e011",
                "name": "Ellipsis DotDot",
                "minWeight": 0,
                "targetWeight": 18,
                "maxWeight": 100,
                "riskFactor": 0,
                "enabled": true,
                "enabledReward": true
            },
            {
                "strategy": "0x27D9425bE1375E7CBB38b9FAaDbD446a0196E6eD",
                "name": "Venus USDC",
                "minWeight": 0,
                "targetWeight": 16.53,
                "maxWeight": 100,
                "riskFactor": 0,
                "enabled": true,
                "enabledReward": true
            },
            {
                "strategy": "0xC7998aCE498eb987D1Ff625Af7Fb7a0449C1C6EE",
                "name": "BetaBsc",
                "minWeight": 0,
                "targetWeight": 0,
                "maxWeight": 100,
                "riskFactor": 0,
                "enabled": false,
                "enabledReward": false
            },
            {
                "strategy": "0x049915356d236a93ff235098042fb27301a9BDf4",
                "name": "GammaBsc",
                "minWeight": 0,
                "targetWeight": 0,
                "maxWeight": 100,
                "riskFactor": 0,
                "enabled": false,
                "enabledReward": false
            },
            {
                "strategy": "0xb4b149F2190773076773A5E88F6eA582c613983e",
                "name": "Magpie USDC",
                "minWeight": 0,
                "targetWeight": 0,
                "maxWeight": 100,
                "riskFactor": 0,
                "enabled": false,
                "enabledReward": true
            },
            {
                "strategy": "0xE84BEB646A7bF50AcA89684542A1e7ed4B30Bfd1",
                "name": "Magpie BUSD",
                "minWeight": 0,
                "targetWeight": 0,
                "maxWeight": 100,
                "riskFactor": 0,
                "enabled": false,
                "enabledReward": true
            },
            {
            "strategy": "0x872Ac5EdAf732E140168f8c7645C47817a04D60D",
                "name": "Thena USDC/USDT",
                "minWeight": 0,
                "targetWeight": 65.47,
                "maxWeight": 100,
                "riskFactor": 0,
                "enabled": false,
                "enabledReward": true
            }
        ];

        weights = await convertWeights(weights);
        let price = await getPrice();

        let pm = await getContract('PortfolioManager');
        await pm.connect(timelock).grantRole(await pm.PORTFOLIO_AGENT_ROLE(), (await initWallet()).address, price);
        console.log("PORTFOLIO_AGENT_ROLE granted")

        await showM2M();

        await pm.setStrategyWeights(weights, price);
        console.log("setStrategyWeights done")

        await showM2M();

        await pm.balance(price);
        console.log("balance done")

        await showM2M();
    });

}


main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });

