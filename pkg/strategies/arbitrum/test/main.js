const { ARBITRUM } = require('@overnight-contracts/common/utils/assets');
const { toE6 } = require('@overnight-contracts/common/utils/decimals');
const { getDataForSwap, inchSwapperUpdatePath} = require('@overnight-contracts/common/utils/inch-helpers');
const { strategyTest } = require('@overnight-contracts/common/utils/strategy-test');
const {
    prepareEnvironment,
    impersonatingStaker,
    impersonatingEtsGrantRoleWithInchSwapper, setStrategyAsDepositor
} = require("@overnight-contracts/common/utils/tests");
const {Wallets} = require("@overnight-contracts/common/utils/wallets");
const {transferETH} = require("@overnight-contracts/common/utils/script-utils");

async function runStrategyLogic(strategyName, strategyAddress) {

    await prepareEnvironment();

    if (strategyName.indexOf('StrategyEts') !== -1 || strategyName.indexOf('StrategySmm') !== -1) {
        await setStrategyAsDepositor(strategyAddress);
    } else if (strategyName === 'StrategySolidlizardUsdcDai') {
        let stakerAddress = '0x8c851D48D9CE7c8A78cF633ED2b153960282B49D';
        let ownerAddress = Wallets.DEV;
        let gauge = '0x884c28296b6ec728ac27bfe7579419709514d154';
        let pair = '0x07d7F291e731A41D3F0EA4F1AE5b6d920ffb3Fe0';
        await impersonatingStaker(stakerAddress, ownerAddress, strategyAddress, pair, gauge)
    } else if (strategyName === "StrategySmmAlpha") {
        let ownerAddress = Wallets.DEV;
        let inchSwapperAddress = ARBITRUM.inchSwapper;
        let hedgeExchangerAddress = "0x42a6079C56258137a48D0EeA0c015ACB5e74D55E";
        let asset = ARBITRUM.usdc;
        let underlyingAsset = ARBITRUM.usdcCircle;
        await impersonatingEtsGrantRoleWithInchSwapper(hedgeExchangerAddress, strategyAddress,
            ownerAddress, inchSwapperAddress, asset, underlyingAsset, toE6(1_000_000), toE6(1_000_000))
    }else if (strategyName === 'StrategySiloUsdtWbtc' || strategyName === 'StrategySiloUsdtArb'){

        await transferETH(10, '0x66B439c0a695cc3Ed3d9f50aA4E6D2D917659FfD')
        await prepareEnvironment();
        await inchSwapperUpdatePath(ARBITRUM.usdc, ARBITRUM.usdt, toE6(1_000_000));
        await inchSwapperUpdatePath(ARBITRUM.usdt, ARBITRUM.usdc, toE6(1_000_000));
    }
}

describe("ARBITRUM", function () {

    let params = {
        name: process.env.TEST_STRATEGY,
        enabledReward: true,
        isRunStrategyLogic: true
    }

    console.log(`Strategy ID ${params.name}`);

    switch (process.env.STAND) {
        case 'arbitrum_dai':
            strategyTest(params, 'ARBITRUM', 'dai', runStrategyLogic);
            break;
        case 'arbitrum_eth':
            strategyTest(params, 'ARBITRUM', 'eth', runStrategyLogic);
            break;
        case 'arbitrum_usdt':
            strategyTest(params, 'ARBITRUM', 'usdt', runStrategyLogic);
            break;
        default:
            strategyTest(params, 'ARBITRUM', 'usdc', runStrategyLogic);
            break;
    }
});
