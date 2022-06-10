const {AVALANCHE} = require('@overnight-contracts/common/utils/assets');
const {strategyTest} = require('@overnight-contracts/common/utils/strategy-test');

let id = process.env.TEST_STRATEGY;

let arrays = [
    {
        name: 'StrategyAave',
        enabledReward: false,
        isRunStrategyLogic: false,
    },
    {
        name: 'StrategyEchidnaUsdc',
        enabledReward: true,
        isRunStrategyLogic: false,
        doubleStakeReward: true,
    },
    {
        name: 'StrategyVectorUsdc',
        enabledReward: true,
        isRunStrategyLogic: false,
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
