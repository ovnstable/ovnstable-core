const {BSC, OPTIMISM, POLYGON} = require('@overnight-contracts/common/utils/assets');
const {strategyTest} = require('@overnight-contracts/ets/tests/ets-test');

let id = process.env.ETS_TEST_STRATEGY;

let arrays = [
    {
        network: 'OPTIMISM',
        name: 'StrategyOpUsdc',
        enabledReward: true,
        balanceDelay:  60 * 60 * 1000
    },
    {
        network: 'OPTIMISM',
        name: 'StrategyWethUsdc',
        enabledReward: true,
    },
    {
        network: 'OPTIMISM',
        name: 'StrategyWethWbtc',
        enabledReward: true,
    },
    {
        network: 'POLYGON',
        name: 'StrategyUsdPlusWmatic',
        enabledReward: false,
        isRunStrategyLogic: false,
    },
    {
        network: 'POLYGON',
        name: 'StrategyQsWmaticUsdc',
        enabledReward: true,
    },
    {
        network: 'POLYGON',
        name: 'StrategyWmaticUsdc',
        enabledReward: true,
    },
    {
        network: 'BSC',
        name: 'StrategyBusdWbnb',
        enabledReward: false,
        isRunStrategyLogic: false,
    },
    {
        network: 'BSC',
        name: 'StrategyUsdPlusWbnb',
        enabledReward: false,
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

describe("ETS", function () {
    arrays.forEach(value => {
        let usdPlus;
        switch (value.network) {
            case "BSC":
                usdPlus = BSC.usdPlus;
                break;
            case "POLYGON":
                usdPlus = POLYGON.usdPlus;
                break;
            case "OPTIMISM":
                usdPlus = OPTIMISM.usdPlus;
                break;
            default:
                throw new Error("Unknown chain");
        }
        strategyTest(value, value.network, usdPlus, runStrategyLogic);
    })
});
