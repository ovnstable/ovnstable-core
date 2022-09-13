const {ethers} = require("hardhat");
const {getContract} = require("@overnight-contracts/common/utils/script-utils");
const {POLYGON} = require("@overnight-contracts/common/utils/assets");

let meshToken = '0x82362Ec182Db3Cf7829014Bc61E9BE8a2E82868a';
let meshSwapWmaticUsdc = '0x6Ffe747579eD4E807Dec9B40dBA18D15226c32dC';
let meshSwapRouter = '0x10f4A785F458Bc144e3706575924889954946639';
let poolFeeMaticUsdc = 500;
let tokenAssetSlippagePercent = 100; //1%
let liquidationThreshold = 850;
let healthFactor = 1200;

module.exports = async () => {

    const strategy = await ethers.getContract("StrategyWmaticUsdc");
    const control = await ethers.getContract('ControlWmaticUsdc');

    const exchange = await getContract('Exchange', 'polygon');
    const usdPlus = await getContract('UsdPlusToken', 'polygon');
    const hedgeExchanger = await getContract('HedgeExchangerWmaticUsdc', 'polygon');

    if (strategy) {

        await (await strategy.setExchanger(hedgeExchanger.address)).wait();

        let setupParams = {
            // common params
            exchange: exchange.address,
            control: control.address,
            // strategy params
            usdPlus: usdPlus.address,
            wmatic: POLYGON.wMatic,
            usdc: POLYGON.usdc,
            meshToken: meshToken,
            meshSwapWmaticUsdc: meshSwapWmaticUsdc,
            meshSwapRouter: meshSwapRouter,
            uniswapV3Router: POLYGON.uniswapV3Router,
            poolFeeMaticUsdc: poolFeeMaticUsdc,
            // aave params
            aavePoolAddressesProvider: POLYGON.aaveProvider,
            tokenAssetSlippagePercent: tokenAssetSlippagePercent,
            liquidationThreshold: liquidationThreshold,
            healthFactor: healthFactor,
        }

        await (await strategy.setParams(setupParams)).wait();

        console.log('Setting done');
    }
};

module.exports.tags = ['StrategyWmaticUsdcSetting'];
