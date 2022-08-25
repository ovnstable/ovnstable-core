const {BSC} = require('@overnight-contracts/common/utils/assets');
const {strategyTest} = require('./strategy-hedge-test-bsc');

let arrays = [

    {
        name: 'StrategyUsdPlusWbnb',
        enabledReward: false,
        isRunStrategyLogic: false,
    },

];



console.log(`Run tests [${arrays.map(value => value.name)}]`);


describe("BSC", function () {

    arrays.forEach(value => {
        strategyTest(value, 'BSC', BSC.usdPlus, ()=>{});
    })
});
