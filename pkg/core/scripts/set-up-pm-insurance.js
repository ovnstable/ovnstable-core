const {toAsset} = require("@overnight-contracts/common/utils/decimals");

const {getContract, showM2M, getCoreAsset, transferETH, initWallet, execTimelock, convertWeights} = require("@overnight-contracts/common/utils/script-utils");
const {DEFAULT} = require("@overnight-contracts/common/utils/assets");


async function main() {

    let pm = await getContract('PortfolioManager', 'localhost');
    let m2m = await getContract('Mark2Market', 'localhost');
    let exchange = await getContract('Exchange', 'localhost');

    let wallet = await initWallet();


    let weights = [
        {
            "strategy": "0x5e0d74aCeC01b8cb9623658Fc356304fEB01Aa96",
            "name": "Aave",
            "minWeight": 0,
            "targetWeight": 2.5,
            "riskFactor": 0,
            "maxWeight": 100,
            "enabled": true,
            "enabledReward": true
        },
        {
            "strategy": "0xde7d6Ee773A8a44C7a6779B40103e50Cd847EFff",
            "name": "Synapse USDC",
            "minWeight": 0,
            "targetWeight": 53,
            "riskFactor": 1,
            "maxWeight": 100,
            "enabled": true,
            "enabledReward": true
        },
        {
            "strategy": "0x0dD66c4f9a739042d313d2db48Bb62aadBcFEdc2",
            "name": "Gains DAI",
            "minWeight": 0,
            "targetWeight": 16.5,
            "riskFactor": 5,
            "maxWeight": 100,
            "enabled": false,
            "enabledReward": true
        },
        {
            "strategy": "0x03eBAAb0AF4C5450a1824B9158aC43349c61fdDa",
            "name": "ETS ALFA",
            "minWeight": 0,
            "targetWeight": 3,
            "riskFactor": 30,
            "maxWeight": 100,
            "enabled": false,
            "enabledReward": false
        },
        {
            "strategy": "0x3114bfDce69a13d2258BD273D231386A074cEC48",
            "name": "ETS BETA",
            "minWeight": 0,
            "targetWeight": 11,
            "riskFactor": 5,
            "maxWeight": 100,
            "enabled": false,
            "enabledReward": false
        },
        {
            "strategy": "0x0B5b9451b3b8C2Ba4e5CDF0ac6d9D05EE3ba9d30",
            "name": "ETS DELTA",
            "minWeight": 0,
            "targetWeight": 11,
            "riskFactor": 5,
            "maxWeight": 100,
            "enabled": false,
            "enabledReward": false
        },
        {
            "strategy": "0xA035AA89B56ab8A5b7865c936f70f02979ea5867",
            "name": "ETS GAMMA",
            "minWeight": 0,
            "targetWeight": 5,
            "riskFactor": 30,
            "maxWeight": 100,
            "enabled": false,
            "enabledReward": false
        }
    ]

    await execTimelock(async (timelock)=>{

        await (await exchange.connect(timelock).setPortfolioManager(pm.address)).wait();
        await (await m2m.connect(timelock).setPortfolioManager(pm.address)).wait();

        await (await pm.connect(timelock).grantRole(await pm.PORTFOLIO_AGENT_ROLE(), wallet.address));
        await (await pm.connect(timelock).grantRole(await pm.PORTFOLIO_AGENT_ROLE(), '0x0bE3f37201699F00C21dCba18861ed4F60288E1D'));
        await (await pm.connect(timelock).grantRole(await pm.PORTFOLIO_AGENT_ROLE(), '0xe497285e466227F4E8648209E34B465dAA1F90a0'));


        for (let i = 0; i < weights.length; i++) {
            let item = weights[i];

            await (await pm.connect(timelock).addStrategy(item.strategy));
        }

        await (await pm.connect(timelock).setCashStrategy(weights[0].strategy));
        console.log('setCashStrategy: ' + weights[0].name);


        weights = await convertWeights(weights);
        await pm.setStrategyWeights(weights);

    });


}


main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });

