const {POLYGON} = require('@overnight-contracts/common/utils/assets');
const {strategyTest} = require('@overnight-contracts/common/utils/strategy-test');

let id = process.env.TEST_STRATEGY;

let arrays = [

    {
        name: 'StrategyAave',
    },
    {
        name: 'StrategyBalancer',
    },
    {
        name: 'StrategyCurve',
    },
    {
        name: 'StrategyDodoUsdc',
    },
    {
        name: 'StrategyDodoUsdt',
    },
    {
        name: 'StrategyIdle',
    },
    {
        name: 'StrategyImpermaxQsUsdt',
    },
    {
        name: 'StrategyIzumi',
    },
    {
        name: 'StrategyMStable',
    },
    {
        name: 'StrategyArrakis',
    }

];


if (id !== undefined && id !== ""){
    console.log(`Strategy ID ${id}`);
    arrays = arrays.filter(value => value.name === id);
}

console.log(`Run tests [${arrays.map(value => value.name)}]`);

describe("Polygon", function () {

    arrays.forEach(value => {
        strategyTest(value.name, 'POLYGON', POLYGON);
    })
});
