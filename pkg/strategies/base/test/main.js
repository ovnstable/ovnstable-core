const { strategyTest } = require('@overnight-contracts/common/utils/strategy-test');
const { impersonatingEtsGrantRole, impersonatingStaker } = require("@overnight-contracts/common/utils/tests");
const {Wallets} = require("@overnight-contracts/common/utils/wallets");

async function runStrategyLogic(strategyName, strategyAddress) {


    if ((strategyName.indexOf('StrategyEts') !== -1) || (strategyName.indexOf('StrategySmm') !== -1)) {
        let hedgeExchangerAddress = "0x32b007034608a8b17B0ABdc675922e5B0da52af5";
        let ownerAddress = Wallets.DEV; // 0x66BC0120b3287f08408BCC76ee791f0bad17Eeef
        await impersonatingEtsGrantRole(hedgeExchangerAddress, ownerAddress, strategyAddress);
    }
}

describe("BASE", function () {
    let params = {
        name: process.env.TEST_STRATEGY,
        enabledReward: true,
        isRunStrategyLogic: true,
        unstakeDelay: 10000000,
    }

    console.log(`Strategy ID ${params.name}`);


    switch (process.env.STAND) {
        case 'base_dai':
            strategyTest(params, 'BASE', 'dai', runStrategyLogic);
            break;
        default:
            strategyTest(params, 'BASE', 'usdc', runStrategyLogic);
            break;
    }
});
