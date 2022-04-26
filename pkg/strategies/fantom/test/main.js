const {FANTOM } = require('@overnight-contracts/common/utils/assets');
const {strategyTest} = require('@overnight-contracts/common/utils/strategy-test');

let id = process.env.TEST_STRATEGY;

let arrays = [
    {
        name: 'StrategyAave',
    },
    {
        name: 'StrategyBeethovenxDeiUsdc',
    },
    {
        name: 'StrategyCurve2Pool',
    },
    {
        name: 'StrategyCurveGeist',
    },
    {
        name: 'StrategyTarotSpiritUsdcFtm',
    },
    {
        name: 'StrategyTarotSpookyUsdcFtm',
    },
    {
        name: 'StrategyTarotSupplyVaultUsdc',
    },
    {
        name: 'StrategyCream',
    },
    {
        name: 'StrategyScream',
    },
    {
        name: 'StrategySpookySwapMaiUsdc',
    },
    {
        name: 'StrategySpookySwapTusdUsdc',
    }
];


if (id !== undefined && id !== ""){
    console.log(`Strategy ID ${id}`);
    arrays = arrays.filter(value => value.name === id);
}

console.log(`Run tests [${arrays.map(value => value.name)}]`);

describe("Fantom", function () {

    arrays.forEach(value => {
        strategyTest(value.name, 'FANTOM', FANTOM);
    })
});
