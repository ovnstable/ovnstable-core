const {getContract, getPrice, execTimelock, initWallet, convertWeights, showM2M} = require("@overnight-contracts/common/utils/script-utils");
const {POLYGON} = require("@overnight-contracts/common/utils/assets");

async function main() {

    await execTimelock(async (timelock) => {

        let weights = [
            {
                "strategy": "0x5e0d74aCeC01b8cb9623658Fc356304fEB01Aa96",
                "name": "Aave",
                "minWeight": 0,
                "targetWeight": 100,
                "riskFactor": 0,
                "maxWeight": 100,
                "enabled": true,
                "enabledReward": true
            },
            {
                "strategy": "0xFed574f62eda014B0C09966D678c06ecbf1AA5df",
                "name": "Balancer USDC",
                "minWeight": 0,
                "targetWeight": 0,
                "riskFactor": 0,
                "maxWeight": 100,
                "enabled": true,
                "enabledReward": true
            }
        ]

        weights = await convertWeights(weights);

        let price = await getPrice();

        let pm = await getContract('PortfolioManager');
        await pm.connect(timelock).grantRole(await pm.PORTFOLIO_AGENT_ROLE(), (await initWallet()).address, price);
        console.log("role granted");

//        let StrategyBalancerUsdc = await getContract('StrategyBalancerUsdc', 'localhost');
//        await StrategyBalancerUsdc.setSlippages(100, 20, 4);
//        console.log("StrategyBalancerUsdc setSlippages done");

        await showM2M();

        await pm.setStrategyWeights(weights, price);
        console.log("setStrategyWeights done");

        await showM2M();

        await pm.balance(price);
        console.log("balance done");

        await showM2M();

    });

}


main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });

