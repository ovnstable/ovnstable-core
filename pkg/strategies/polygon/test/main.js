const {POLYGON} = require('@overnight-contracts/common/utils/assets');
const {strategyTest} = require('@overnight-contracts/common/utils/strategy-test');

let arrays = [
    //
    // {
    //     name: 'StrategyAave',
    // },
    // {
    //     name: 'StrategyBalancer',
    // },
    // {
    //     name: 'StrategyCurve',
    // },
    {
        name: 'StrategyDodoUsdc',
    },
    {
        name: 'StrategyDodoUsdt',
    },
    // {
    //     name: 'StrategyIdle',
    // },
    // {
    //     name: 'StrategyImpermaxQsUsdt',
    // },
    // {
    //     name: 'StrategyIzumi',
    // },
    // {
    //     name: 'StrategyMStable',
    // },
    // {
    //     name: 'StrategyArrakis',
    // }

];


describe("Polygon", function () {

    arrays.forEach(value => {
        strategyTest(value.name, 'POLYGON', POLYGON);
    })
});
