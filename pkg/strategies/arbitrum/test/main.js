const { ARBITRUM } = require('@overnight-contracts/common/utils/assets');
const { toE6 } = require('@overnight-contracts/common/utils/decimals');
const { getDataForSwap } = require('@overnight-contracts/common/utils/inch-helpers');
const { strategyTest } = require('@overnight-contracts/common/utils/strategy-test');
const {
    impersonatingEtsGrantRole,
    prepareEnvironment,
    impersonatingStaker,
    impersonatingEtsGrantRoleWithInchSwapper
} = require("@overnight-contracts/common/utils/tests");

async function runStrategyLogic(strategyName, strategyAddress) {

    await prepareEnvironment();

    if (strategyName.indexOf('StrategyEts') !== -1) {
        let hedgeExchangerAddress = "0xe2fe8783CdC724EC021FF9052eE8EbEd00e6248e";
        let ownerAddress = "0x5CB01385d3097b6a189d1ac8BA3364D900666445";
        await impersonatingEtsGrantRole(hedgeExchangerAddress, ownerAddress, strategyAddress);

    } else if (strategyName === 'StrategySolidlizardUsdcDai') {
        let stakerAddress = '0x8c851D48D9CE7c8A78cF633ED2b153960282B49D';
        let ownerAddress = '0x5CB01385d3097b6a189d1ac8BA3364D900666445';
        let gauge = '0x884c28296b6ec728ac27bfe7579419709514d154';
        let pair = '0x07d7F291e731A41D3F0EA4F1AE5b6d920ffb3Fe0';
        await impersonatingStaker(stakerAddress, ownerAddress, strategyAddress, pair, gauge)
    } else if (strategyName == "StrategySmmAlpha") {
        let ownerAddress = "0x5CB01385d3097b6a189d1ac8BA3364D900666445";
        let inchSwapperAddress = ARBITRUM.inchSwapper;
        let hedgeExchangerAddress = "0x42a6079C56258137a48D0EeA0c015ACB5e74D55E";
        let asset = ARBITRUM.usdc;
        let underlyingAsset = ARBITRUM.usdcCircle;
        await impersonatingEtsGrantRoleWithInchSwapper(hedgeExchangerAddress, strategyAddress,
            ownerAddress, inchSwapperAddress, asset, underlyingAsset, toE6(1_000_000), toE6(1_000_000))
    }
}

describe("ARBITRUM", function () {

    let params = {
        name: process.env.TEST_STRATEGY,
        enabledReward: false,
        isRunStrategyLogic: true
    }

    console.log(`Strategy ID ${params.name}`);

    switch (process.env.STAND) {
        case 'arbitrum_dai':
            strategyTest(params, 'ARBITRUM', 'dai', runStrategyLogic);
            break;
        default:
            strategyTest(params, 'ARBITRUM', 'usdc', runStrategyLogic);
            break;
    }
});
