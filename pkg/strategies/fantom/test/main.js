const {FANTOM} = require('@overnight-contracts/common/utils/assets');
const {strategyTest} = require('@overnight-contracts/common/utils/strategy-test');

let id = process.env.TEST_STRATEGY;

let arrays = [
    {
        name: 'StrategyAave',
        enabledReward: false,
    },
    {
        name: 'StrategyBeethovenxDeiUsdc',
        enabledReward: true,
    },
    {
        name: 'StrategyCurve2Pool',
        enabledReward: true,
    },
    {
        name: 'StrategyCurveGeist',
        enabledReward: true,
    },
    {
        name: 'StrategyTarotSpiritUsdcFtm',
        enabledReward: false,
    },
    {
        name: 'StrategyTarotSpookyUsdcFtm',
        enabledReward: false,
    },
    {
        name: 'StrategyTarotSupplyVaultUsdc',
        enabledReward: false,
    },
    {
        name: 'StrategyCream',
        enabledReward: false,
    },
    {
        name: 'StrategyScream',
        enabledReward: true,
    },
];


if (id !== undefined && id !== "") {
    console.log(`Strategy ID ${id}`);
    arrays = arrays.filter(value => value.name === id);
}

console.log(`Run tests [${arrays.map(value => value.name)}]`);

describe("Fantom", function () {

    arrays.forEach(value => {
        strategyTest(value, 'FANTOM', FANTOM);
    })
});
