const { strategyTest } = require('@overnight-contracts/common/utils/strategy-test');
const { impersonatingEtsGrantRole, impersonatingStaker } = require("@overnight-contracts/common/utils/tests");
const {Wallets} = require("@overnight-contracts/common/utils/wallets");

async function runStrategyLogic(strategyName, strategyAddress) {


    if ((strategyName.indexOf('StrategyEts') !== -1) || (strategyName.indexOf('StrategySmm') !== -1)) {
        let hedgeExchangerAddress = "0x84d05333f1F5Bf1358c3f63A113B1953C427925D";
        let ownerAddress = Wallets.DEV;  
        await impersonatingEtsGrantRole(hedgeExchangerAddress, ownerAddress, strategyAddress);
    }
}

describe("ZKSYNC", function () {
    let params = {
        name: process.env.TEST_STRATEGY,
        enabledReward: true,
        isRunStrategyLogic: true
    }

    console.log(`Strategy ID ${params.name}`);


    switch (process.env.STAND) {
        case 'zksync':
            strategyTest(params, 'ZKSYNC', 'usdc', runStrategyLogic);
            break;
        default:
            break;
    }
});
