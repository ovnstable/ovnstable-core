const {ethers} = require("hardhat");
const {getContract} = require("@overnight-contracts/common/utils/script-utils");
const {POLYGON} = require("@overnight-contracts/common/utils/assets");

let quickToken = '0x831753DD7087CaC61aB5644b308642cc1c33Dc13';
let dQuickToken = '0xf28164A485B0B2C90639E47b0f377b4a438a16B1';
let quickswapWmaticUsdc = '0x6e7a5FAFcec6BB1e78bAE2A1F0B612012BF14827';
let quickswapRouter = '0xa5E0829CaCEd8fFDD4De3c43696c57F7D7A678ff';
let stakingDualRewards = '0x14977e7E263FF79c4c3159F497D9551fbE769625';
let poolFeeMaticUsdc = 500;
let tokenAssetSlippagePercent = 100; //1%
let liquidationThreshold = 850;
let healthFactor = 1200;

module.exports = async () => {

    const strategy = await ethers.getContract("StrategyQsWmaticUsdc");
    const control = await ethers.getContract('ControlQsWmaticUsdc');

    const exchange = await getContract('Exchange');
    const usdPlus = await getContract('UsdPlusToken');
    const hedgeExchanger = await getContract('HedgeExchangerQsWmaticUsdc');

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
            dQuickToken: dQuickToken,
            quickswapWmaticUsdc: quickswapWmaticUsdc,
            quickswapRouter: quickswapRouter,
            stakingDualRewards: stakingDualRewards,
            uniswapV3Router: POLYGON.uniswapV3Router,
            poolFeeMaticUsdc: poolFeeMaticUsdc,
            // aave params
            aavePoolAddressesProvider: POLYGON.aaveProvider,
            tokenAssetSlippagePercent: tokenAssetSlippagePercent,
            liquidationThreshold: liquidationThreshold,
            healthFactor: healthFactor,
            quickToken: quickToken,
        }

        await (await strategy.setParams(setupParams)).wait();

        console.log('Setting done');
    }
};

module.exports.tags = ['StrategyQsWmaticUsdcSetting'];
