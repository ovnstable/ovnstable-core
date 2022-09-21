const {ethers} = require("hardhat");
const {getContract} = require("@overnight-contracts/common/utils/script-utils");
const {OPTIMISM} = require("@overnight-contracts/common/utils/assets");

let velo = '0x3c8B650257cFb5f272f799F5e2b4e65093a11a05';
let router = '0x9c12939390052919aF3155f41Bf4160Fd3666A6f';
let gauge = '0x0299d40E99F2a5a1390261f5A71d13C3932E214C';
let pair = '0x47029bc8f5cbe3b464004e87ef9c9419a48018cd'; //vAMM-OP/USDC
let granaryAddressesProvider = '0xdDE5dC81e40799750B92079723Da2acAF9e1C6D6';
let poolFeeOpUsdc = 500; // 0.05%
let poolFeeOpWeth = 3000; // 0.3%
let poolFeeWethUsdc = 500; // 0.05%
let isStableVeloUsdc = false;
let tokenAssetSlippagePercent = 100; //1%
let liquidationThreshold = 850;
let healthFactor = 1200;

module.exports = async () => {

    const strategy = await ethers.getContract("StrategyOpUsdc");
    const control = await ethers.getContract('ControlOpUsdc');

    const exchange = await getContract('Exchange');
    const usdPlus = await getContract('UsdPlusToken');
    const hedgeExchanger = await getContract('HedgeExchangerOpUsdc');

    if (strategy) {

        await (await strategy.setExchanger(hedgeExchanger.address)).wait();

        let setupParams = {
            // common params
            exchange: exchange.address,
            control: control.address,
            // strategy params
            usdPlus: usdPlus.address,
            op: OPTIMISM.op,
            usdc: OPTIMISM.usdc,
            weth: OPTIMISM.weth,
            velo: velo,
            router: router,
            gauge: gauge,
            pair: pair,
            uniswapV3Router: OPTIMISM.uniswapV3Router,
            poolFeeOpUsdc: poolFeeOpUsdc,
            poolFeeOpWeth: poolFeeOpWeth,
            poolFeeWethUsdc: poolFeeWethUsdc,
            isStableVeloUsdc: isStableVeloUsdc,
            // aave params
            aavePoolAddressesProvider: granaryAddressesProvider,
            tokenAssetSlippagePercent: tokenAssetSlippagePercent,
            liquidationThreshold: liquidationThreshold,
            healthFactor: healthFactor
        }

        await (await strategy.setParams(setupParams)).wait();

        console.log('Setting done');
    }
};

module.exports.tags = ['StrategyOpUsdcSetting'];
