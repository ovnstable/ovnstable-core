const {strategyTest} = require('@overnight-contracts/common/utils/strategy-test');
const {impersonatingEtsGrantRole, impersonatingStaker} = require("@overnight-contracts/common/utils/tests");
const {Wallets} = require("@overnight-contracts/common/utils/wallets");

async function runStrategyLogic(strategyName, strategyAddress) {


    if (strategyName.indexOf('StrategyEts') !== -1) {
        let hedgeExchangerAddress = "0x181AAb77E68CD6803f60cbAE88674dE20101bf3f";
        let ownerAddress = Wallets.DEV;
        await impersonatingEtsGrantRole(hedgeExchangerAddress, ownerAddress, strategyAddress);
    }
}

describe("LINEA", function () {
    let params = {
        name: process.env.TEST_STRATEGY,
        enabledReward: true,
        isRunStrategyLogic: true
    }

    console.log(`Strategy ID ${params.name}`);

    switch (process.env.STAND) {
        case 'linea_usdt':
            strategyTest(params, 'LINEA', 'usdt', runStrategyLogic);
            break;
        default:
            strategyTest(params, 'LINEA', 'usdc', runStrategyLogic);
            break;
    }
});
