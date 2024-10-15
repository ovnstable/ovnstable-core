const { strategyTest } = require('@overnight-contracts/common/utils/strategy-test');
const { impersonatingEtsGrantRole, impersonatingStaker } = require("@overnight-contracts/common/utils/tests");
const {Wallets} = require("@overnight-contracts/common/utils/wallets");

async function runStrategyLogic(strategyName, strategyAddress) {


    if ((strategyName.indexOf('StrategyEts') !== -1) || (strategyName.indexOf('StrategySmm') !== -1)) {
        let hedgeExchangerAddress = "0xce8CB94CB04D5E29926E8E8Db1431bbCc6B8A941";
        let ownerAddress = Wallets.DEV; // 0xab918d486c61ADd7c577F1af938117bBD422f088
        await impersonatingEtsGrantRole(hedgeExchangerAddress, ownerAddress, strategyAddress);
    }
}

describe("BASE", function () {
    let params = {
        name: process.env.TEST_STRATEGY,
        enabledReward: true,
        isRunStrategyLogic: true,
        //unstakeDelay: 1000000,  // 11.57 days
        unstakeDelay: 30*24*60*60,    // around a month
        //unstakeDelay: delay,
        delay: 1*60*60,
        doubleStakeReward: true,
        doubleFarm: true,
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
