const {FANTOM} = require('@overnight-contracts/common/utils/assets');
const {strategyTest} = require('@overnight-contracts/common/utils/strategy-test');

let id = process.env.TEST_STRATEGY;

let arrays = [
    {
        name: 'StrategyAave',
        enabledReward: false,
        isRunStrategyLogic: false,
    },
    {
        name: 'StrategyBeethovenxDeiUsdc',
        enabledReward: true,
        isRunStrategyLogic: false,
    },
    {
        name: 'StrategyCurve2Pool',
        enabledReward: true,
        isRunStrategyLogic: false,
    },
    {
        name: 'StrategyCurveGeist',
        enabledReward: true,
        isRunStrategyLogic: false,
    },
    {
        name: 'StrategyTarotSpiritUsdcFtm',
        enabledReward: false,
        isRunStrategyLogic: false,
    },
    {
        name: 'StrategyTarotSpookyUsdcFtm',
        enabledReward: false,
        isRunStrategyLogic: false,
    },
    {
        name: 'StrategyTarotSupplyVaultUsdc',
        enabledReward: false,
        isRunStrategyLogic: false,
    },
    {
        name: 'StrategyCream',
        enabledReward: false,
        isRunStrategyLogic: false,
    },
    {
        name: 'StrategyScream',
        enabledReward: true,
        isRunStrategyLogic: false,
    },
    {
        name: 'StrategySpookySwapMaiUsdc',
        enabledReward: true,
        isRunStrategyLogic: false,
    },
    {
        name: 'StrategySpookySwapTusdUsdc',
        enabledReward: true,
        isRunStrategyLogic: false,
    },
    {
        name: 'StrategyWigoUsdcDai',
        enabledReward: true,
        isRunStrategyLogic: false,
    },
    {
        name: 'StrategyWigoUsdcFUsdt',
        enabledReward: true,
        isRunStrategyLogic: false,
    },
    {
        name: 'StrategyBeethovenxUsdcAsUsdc',
        enabledReward: true,
        isRunStrategyLogic: false,
    },
];


if (id !== undefined && id !== "") {
    console.log(`Strategy ID ${id}`);
    arrays = arrays.filter(value => value.name === id);
}

console.log(`Run tests [${arrays.map(value => value.name)}]`);

async function runStrategyLogic(strategyName, strategyAddress) {

}

describe("Fantom", function () {

    arrays.forEach(value => {
        strategyTest(value, 'FANTOM', 'usdc', runStrategyLogic);
    })
});
