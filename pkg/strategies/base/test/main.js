const {strategyTest} = require('@overnight-contracts/common/utils/strategy-test');

async function runStrategyLogic(strategyName, strategyAddress) {


}

describe("BASE", function () {
    let params = {
        name: process.env.TEST_STRATEGY,
        enabledReward: true,
        isRunStrategyLogic: true
    }

    console.log(`Strategy ID ${params.name}`);


    switch (process.env.STAND) {
        case 'base_dai':
            strategyTest(params, 'BASE', 'dai', runStrategyLogic);
            break;
        default:
            strategyTest(params, 'BASE', 'usdbc', runStrategyLogic);
            break;
    }
});
