const {ethers} = require("hardhat");
const {getContract} = require("@overnight-contracts/common/utils/script-utils");
const {OPTIMISM} = require("@overnight-contracts/common/utils/assets");

let velo = '0x3c8B650257cFb5f272f799F5e2b4e65093a11a05';
let router = '0x9c12939390052919af3155f41bf4160fd3666a6f';
let gauge = '0xe2cec8ab811b648ba7b1691ce08d5e800dd0a60a';
let pair = '0x79c912fef520be002c2b6e57ec4324e260f38e50'; //vAMM-WETH/USDC
let poolFee0 = 3000; // 0.3%
let poolFee1 = 500; // 0.05%
let tokenAssetSlippagePercent = 100; //1%
let liquidationThreshold = 850;
let healthFactor = 1200;

module.exports = async () => {

    const strategy = await ethers.getContract("StrategyWethUsdc");
    const control = await ethers.getContract('ControlWethUsdc');

    const exchange = await getContract('Exchange', 'optimism');
    const usdPlus = await getContract('UsdPlusToken', 'optimism');
    const hedgeExchanger = await getContract('HedgeExchangerWethUsdc', 'optimism');

    if (strategy) {

        await (await strategy.setExchanger(hedgeExchanger.address)).wait();

        let setupParams = {
            // common params
            exchange: exchange.address,
            control: control.address,
            // strategy params
            usdPlus: usdPlus.address,
            weth: OPTIMISM.weth,
            usdc: OPTIMISM.usdc,
            velo: velo,
            router: router,
            gauge: gauge,
            pair: pair,
            uniswapV3Router: OPTIMISM.uniswapV3Router,
            poolFee0: poolFee0,
            poolFee1: poolFee1,
            // aave params
            aavePoolAddressesProvider: OPTIMISM.aaveProvider,
            tokenAssetSlippagePercent: tokenAssetSlippagePercent,
            liquidationThreshold: liquidationThreshold,
            healthFactor: healthFactor,
        }

        await (await strategy.setParams(setupParams)).wait();

        console.log('Setting done');
    }
};

module.exports.tags = ['StrategyWethUsdcSetting'];
