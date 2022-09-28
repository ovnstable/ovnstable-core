const {ethers} = require("hardhat");
const {getContract} = require("@overnight-contracts/common/utils/script-utils");
const {OPTIMISM} = require("@overnight-contracts/common/utils/assets");

let nonfungiblePositionManager = '0xC36442b4a4522E871399CD717aBDD847Ab11FE88';
let uniswapV3Pool = '0x73B14a78a0D396C521f954532d43fd5fFe385216';
let beethovenxVault = '0xBA12222222228d8Ba445958a75a0704d566BF2C8';
let poolIdWethWbtc = "0x5028497af0c9a54ea8c6d42a054c0341b9fc6168000100000000000000000004";
let veloRouter = '0x9c12939390052919af3155f41bf4160fd3666a6f';

let poolFee0 = 3000; // 0.3%
let tokenAssetSlippagePercent = 100; //1%
let liquidationThreshold = 750;
let healthFactor = 1200;
let isStableVeloWbtc = false;
let isStableOpWbtc = false;
let lowerPercent = 3000; //30%
let upperPercent = 3000; //30%

module.exports = async () => {

    const strategy = await getContract("StrategyWethWbtc");
    const control = await getContract('ControlWethWbtc');
    const hedgeExchanger = await getContract('HedgeExchangerWethWbtc');

    if (strategy) {

        await (await strategy.setExchanger(hedgeExchanger.address)).wait();

        let setupParams = {
            control: control.address,
            // strategy params
            weth: OPTIMISM.weth,
            wbtc: OPTIMISM.wbtc,
            nonfungiblePositionManager: nonfungiblePositionManager,
            uniswapV3Pool: uniswapV3Pool,
            lowerPercent: lowerPercent,
            upperPercent: upperPercent,
            poolFee0: poolFee0,
            // aave params
            aavePoolAddressesProvider: OPTIMISM.aaveProvider,
            tokenAssetSlippagePercent: tokenAssetSlippagePercent,
            liquidationThreshold: liquidationThreshold,
            healthFactor: healthFactor,
            rewardsController: OPTIMISM.rewardsController,
            aWbtc: OPTIMISM.aWbtc,
            op: OPTIMISM.op,
            isStableVeloWbtc: isStableVeloWbtc,
            isStableOpWbtc: isStableOpWbtc,
            beethovenxVault: beethovenxVault,
            poolIdWethWbtc: poolIdWethWbtc
        }

        await (await strategy.setParams(setupParams)).wait();

        console.log('Setting done');
    }
};

module.exports.tags = ['StrategyWethWbtcSetting'];
