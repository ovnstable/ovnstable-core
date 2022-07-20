const {BSC} = require('@overnight-contracts/common/utils/assets');
const {strategyTest} = require('@overnight-contracts/common/utils/strategy-test');

let id = process.env.TEST_STRATEGY;

let arrays = [
    {
        name: 'StrategyVenusBUSD',
        enabledReward: false,
    },
    {
        name: 'StrategyStargateBUSD',
        enabledReward: true,
    },
    {
        name: 'StrategySynapseBUSD',
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
        strategyTest(value, 'BSC', BSC.busd, runStrategyLogic);
    })
});
