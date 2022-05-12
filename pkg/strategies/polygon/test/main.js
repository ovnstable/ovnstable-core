const {POLYGON} = require('@overnight-contracts/common/utils/assets');
const {strategyTest} = require('@overnight-contracts/common/utils/strategy-test');

let id = process.env.TEST_STRATEGY;

let arrays = [

    {
        name: 'StrategyAave',
        enabledReward: false,
    },
    {
        name: 'StrategyBalancer',
        enabledReward: true,
    },
    {
        name: 'StrategyCurve',
        enabledReward: false,
    },
    {
        name: 'StrategyDodoUsdc',
        enabledReward: true,
    },
    {
        name: 'StrategyDodoUsdt',
        enabledReward: true,
    },
    {
        name: 'StrategyIdle',
        enabledReward: false,
    },
    {
        name: 'StrategyImpermaxQsUsdt',
        enabledReward: false,
    },
    {
        name: 'StrategyMStable',
        enabledReward: true,
    },
    {
        name: 'StrategyIzumi',
        enabledReward: true,
    },
    {
        name: 'StrategyArrakis',
        enabledReward: true,
    },
    {
        name: 'StrategyMeshSwapUsdc',
        enabledReward: true,
    },
    {
        name: 'StrategyTetuUsdc',
        enabledReward: true,
    }

];


if (id !== undefined && id !== "") {
    console.log(`Strategy ID ${id}`);
    arrays = arrays.filter(value => value.name === id);
}

console.log(`Run tests [${arrays.map(value => value.name)}]`);

describe("Polygon", function () {

    arrays.forEach(value => {
        strategyTest(value, 'POLYGON', POLYGON);
    })
});
