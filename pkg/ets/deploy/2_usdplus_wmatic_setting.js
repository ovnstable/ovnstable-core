const {ethers} = require("hardhat");
const {POLYGON} = require("@overnight-contracts/common/utils/assets");
const {getContract } = require("@overnight-contracts/common/utils/script-utils");

let dystRouter = '0xbE75Dd16D029c6B32B7aD57A0FD9C1c20Dd2862e'; //DystRouter01
let dystPair = '0x1A5FEBA5D5846B3b840312Bd04D76ddaa6220170'; //WMATIC/USD+
let gauge = '0x7c9716266795a04ae1fbbd017dc2585fbf78076d'; //aka MasterChef
let dystToken = '0x39aB6574c289c3Ae4d88500eEc792AB5B947A5Eb';
let uniswapV3Router = '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45';
let poolFeeMaticUsdc = 500;


let penToken = '0x9008D70A5282a936552593f410AbcBcE2F891A97';
let penProxy = '0xc9Ae7Dac956f82074437C6D40f67D6a5ABf3E34b';
let penLens = '0x1432c3553FDf7FBD593a84B3A4d380c643cbf7a2';

let wmaticUsdcSlippagePersent = 10; //0.1%

let liquidationThreshold = 850;
let healthFactor = 1350
let balancingDelta = 1;

module.exports = async () => {

    const strategy = await ethers.getContract("StrategyUsdPlusWmatic");

    const exchange = await getContract('Exchange', 'polygon');
    const usdPlus = await getContract('UsdPlusToken', 'polygon');

    if (strategy) {

        await (await strategy.setExchanger('0x4b5e0af6AE8Ef52c304CD55f546342ca0d3050bf'));


        let setupParams = {
            // tokens
            usdc: POLYGON.usdc,
            aUsdc: POLYGON.amUsdc,
            wmatic: POLYGON.wMatic,
            usdPlus: usdPlus.address,
            penToken: penToken,
            dyst: dystToken,
            // common
            exchanger: exchange.address,
            dystRewards: gauge,
            dystVault: dystPair,
            dystRouter: dystRouter,
            penProxy: penProxy,
            penLens: penLens,
            wmaticUsdcSlippagePersent: wmaticUsdcSlippagePersent,
            // aave
            aavePoolAddressesProvider: POLYGON.aaveProvider,
            liquidationThreshold: liquidationThreshold,
            healthFactor: healthFactor,
            balancingDelta: balancingDelta,
            uniswapV3Router: uniswapV3Router,
            poolFeeMaticUsdc: poolFeeMaticUsdc
        }

        await (await strategy.setParams(setupParams)).wait();

        console.log('Setting done');
    }


};

module.exports.tags = ['StrategyUsdPlusWmaticSetting'];
