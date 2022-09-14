const {OPTIMISM} = require('@overnight-contracts/common/utils/assets');
const {strategyTest} = require('@overnight-contracts/common/utils/strategy-test');

let id = process.env.TEST_STRATEGY;

let arrays = [
    {
        name: 'StrategyAave',
        enabledReward: true,
    },
    {
        name: 'StrategySynapseUsdc',
        enabledReward: true,
    },
    {
        name: 'StrategyVelodromeUsdcDai',
        enabledReward: true,
    },
    {
        name: 'StrategyRubiconUsdc',
        enabledReward: true,
    },
    {
        name: 'StrategyPikaUsdc',
        enabledReward: true,
        unstakeDelay:  60 * 60 * 1000
    },
    {
        name: 'StrategyRubiconDai',
        enabledReward: true,
    },

    {
        name: 'StrategyRubiconUsdt',
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

describe("OPTIMISM", function () {
    arrays.forEach(value => {
        strategyTest(value, 'OPTIMISM', OPTIMISM.usdc, runStrategyLogic);
    })
});
