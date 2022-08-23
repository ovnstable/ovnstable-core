const {BSC} = require('@overnight-contracts/common/utils/assets');
const {strategyTest} = require('./strategy-hedge-test-bsc');
let id = process.env.TEST_STRATEGY;

let arrays = [

    {
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


describe("BSC", function () {

    arrays.forEach(value => {
        strategyTest(value, 'BSC', BSC.usdPlus, ()=>{});
    })
});
