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
        unstakeDelay: 3*24*60*60,    // around a month
        //unstakeDelay: delay,
        delay: 1*60*60/3,

        /* If true then:
            1. initial stake of amount.
            2. Waits <delay> seconds
            3. Stakes same amount again
            4. Immediately claims rewards.
        */
        doubleStakeReward: true,


        /*  
        If true and <doubleStakeReward> is true, 
        then assetValue*4 will be staked (first assetValue, then assetValue, then 2*assetValue)
        
        If true but <doubleStakeReward> is false then 2*assetValue will be staked in 2 portions.

        Then waits <delay> seconds.
        Then claims rewards.
        In the end of test it checks that farmed rewards balance <doubleFarmMultiplier> times more than was claimed in rewards in 
        previous <doubleStakeReward> option (one time amount).
        */ 
        doubleFarm: true,

        doubleFarmMultiplier: 1.1,
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
