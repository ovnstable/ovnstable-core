const { strategyTest } = require('@overnight-contracts/common/utils/strategy-test');
const { impersonatingEtsGrantRole, impersonatingStaker } = require("@overnight-contracts/common/utils/tests");

async function runStrategyLogic(strategyName, strategyAddress) {


    if ((strategyName.indexOf('StrategyEts') !== -1) || (strategyName.indexOf('StrategySmm') !== -1)) {
        let hedgeExchangerAddress = "0xE4A765E2D178c007Ba04B444f172e99b10F70421";
        let ownerAddress = "0x5CB01385d3097b6a189d1ac8BA3364D900666445"; // 0x66BC0120b3287f08408BCC76ee791f0bad17Eeef
        await impersonatingEtsGrantRole(hedgeExchangerAddress, ownerAddress, strategyAddress);
    }
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
