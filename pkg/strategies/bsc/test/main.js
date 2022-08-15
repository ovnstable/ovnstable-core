const {BSC} = require('@overnight-contracts/common/utils/assets');
const {strategyTest} = require('@overnight-contracts/common/utils/strategy-test');

let id = process.env.TEST_STRATEGY;

let arrays = [
    {
        name: 'StrategyVenusBusd',
        enabledReward: false,
    },
    {
        name: 'StrategyStargateBusd',
        enabledReward: true,
    },
    {
        name: 'StrategySynapseBusd',
        enabledReward: true,
    },
    {
        name: 'StrategyVenusUsdc',
        enabledReward: false,
    },
    {
        name: 'StrategySynapseUsdc',
        enabledReward: true,
    },
    {
        name: 'StrategyVenusUsdt',
        enabledReward: false,
    },
    {
        name: 'StrategyStargateUsdt',
        enabledReward: true,
    },
    {
        name: 'StrategySynapseUsdt',
        enabledReward: true,
    },
];

if (id !== undefined && id !== "") {
    console.log(`Strategy ID ${id}`);
    arrays = arrays.filter(value => value.name === id);
}

console.log(`Run tests [${arrays.map(value => value.name)}]`);

async function runStrategyLogic(strategyName, strategyAddress) {
}

describe("BSC", function () {
    arrays.forEach(value => {
        switch (process.env.STAND) {
            case 'bsc_usdc':
                strategyTest(value, 'BSC', BSC.usdc, runStrategyLogic);
                break;
            case 'bsc_usdt':
                strategyTest(value, 'BSC', BSC.usdt, runStrategyLogic);
                break;
            default:
                strategyTest(value, 'BSC', BSC.busd, runStrategyLogic);
                break;
        }
    })
});
