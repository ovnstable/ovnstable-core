const {getContract, initWallet, getPrice, showHedgeM2M} = require("@overnight-contracts/common/utils/script-utils");
const {createProposal} = require("@overnight-contracts/common/utils/governance");
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

async function main() {

    let strategy = await getContract('StrategyQsWmaticUsdc');
    const control = await getContract('ControlQsWmaticUsdc');
    const exchange = await getContract('Exchange');
    const usdPlus = await getContract('UsdPlusToken');

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

    let addresses = [];
    let values = [];
    let abis = [];

    addresses.push(strategy.address);
    values.push(0);
    abis.push(strategy.interface.encodeFunctionData('upgradeTo', ['0xEDd73E66aA2bF019eaC6fee4C8028D7974f6bcEB']));

    addresses.push(strategy.address);
    values.push(0);
    abis.push(strategy.interface.encodeFunctionData('setParams', [setupParams]));

    await createProposal(addresses, values, abis);

}


main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
