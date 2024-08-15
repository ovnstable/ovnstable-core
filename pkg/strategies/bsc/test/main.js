const {BSC} = require('@overnight-contracts/common/utils/assets');
const {strategyTest} = require('@overnight-contracts/common/utils/strategy-test');
const {getContract, transferETH} = require("@overnight-contracts/common/utils/script-utils");
const {impersonatingEtsGrantRole} = require("@overnight-contracts/common/utils/tests");
const hre = require('hardhat');
const ethers = hre.ethers;

const HedgeExchanger = require("./abi/ets/HedgeExchanger.json");
const {Wallets} = require("@overnight-contracts/common/utils/wallets");

async function runStrategyLogic(strategyName, strategyAddress) {

    if (strategyName.indexOf('StrategyEts') !== -1) {
        let hedgeExchangerAddress = "0x65AfD05fbc4413948ffaaD8bCb13f71b6f79332D";
        let ownerAddress = Wallets.DEV;
        await impersonatingEtsGrantRole(hedgeExchangerAddress, ownerAddress, strategyAddress);

    } else if (strategyName == 'StrategyUsdPlusUsdt') {
        let exchange = await getContract("Exchange", "bsc");
        await exchange.grantRole(await exchange.FREE_RIDER_ROLE(), strategyAddress);

    } else if (strategyName == 'StrategyUsdcUsdtPlus') {
        let exchange = await getContract("Exchange", "bsc_usdt");
        await exchange.grantRole(await exchange.FREE_RIDER_ROLE(), strategyAddress);
    }
}

describe("BSC", function () {
    let params = {
        name: process.env.TEST_STRATEGY,
        enabledReward: true,
        isRunStrategyLogic: true
    }

    console.log(`Strategy ID ${params.name}`);

    switch (process.env.STAND) {
        case "bsc_usdt":
            strategyTest(params, 'BSC', 'usdt', runStrategyLogic);
            break;
        default:
            strategyTest(params, 'BSC', 'usdc', runStrategyLogic);
            break;
    }
});
