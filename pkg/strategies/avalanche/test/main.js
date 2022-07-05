const {AVALANCHE} = require('@overnight-contracts/common/utils/assets');
const {strategyTest} = require('@overnight-contracts/common/utils/strategy-test');

let id = process.env.TEST_STRATEGY;

let arrays = [
    {
        name: 'StrategyAave',
        enabledReward: false,
    },
    {
        name: 'StrategyEchidnaUsdc',
        enabledReward: true,
        doubleStakeReward: true,
    },
    {
        name: 'StrategyVectorUsdc',
        enabledReward: true,
    },
    {
        name: 'StrategySynapseUsdce',
        enabledReward: true,
    },
];

if (id !== undefined && id !== "") {
    console.log(`Strategy ID ${id}`);
    arrays = arrays.filter(value => value.name === id);
}

async function runStrategyLogic(strategyName, strategyAddress) {
}

console.log(`Run tests [${arrays.map(value => value.name)}]`);

describe("Avalanche", function () {
    arrays.forEach(value => {
        strategyTest(value, 'AVALANCHE', AVALANCHE, runStrategyLogic);
    })
});
