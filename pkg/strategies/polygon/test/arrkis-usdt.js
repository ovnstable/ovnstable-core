const {POLYGON} = require('@overnight-contracts/common/utils/assets');
const {strategyTest} = require('@overnight-contracts/common/utils/strategy-test');
describe("Polygon", function () {

    let value = {
        name: 'StrategyArrakisUsdt',
        enabledReward: true,
    };

    strategyTest(value, 'POLYGON', POLYGON, ()=>{});
});

