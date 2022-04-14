const {FANTOM} = require('@overnight-contracts/common/utils/assets');
const {strategyTest} = require('@overnight-contracts/common/utils/strategy-test');

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

];


describe("Fantom", function () {

    arrays.forEach(value => {
        strategyTest(value.name, 'FANTOM', FANTOM);
    })
});
