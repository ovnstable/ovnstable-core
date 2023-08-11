const {getContract, getPrice} = require("@overnight-contracts/common/utils/script-utils");
const {createProposal, testProposal} = require("@overnight-contracts/common/utils/governance");
const {fromE6, fromE18} = require("@overnight-contracts/common/utils/decimals");

async function main() {

    let pmUsd = await getContract('PortfolioManager', 'base');
    let pmDai = await getContract('PortfolioManager', 'base_dai');
    let baseSwap = await getContract('StrategyBaseSwapUsdbcDai', 'base');
    let uniV3Dai = await getContract('StrategyUniV3Dai', 'base_dai');

    // For test
    // await (await uniV3Dai.resetNewPosition()).wait();

    // Test block: 2489907
    console.log('BaseSwap USDC/DAI: ' + fromE6(await baseSwap.netAssetValue()));
    console.log('UniV3         DAI: ' + fromE18(await uniV3Dai.netAssetValue()));
    await (await pmDai.balance()).wait();
    console.log('BaseSwap USDC/DAI: ' + fromE6(await baseSwap.netAssetValue()));
    console.log('UniV3         DAI: ' + fromE18(await uniV3Dai.netAssetValue()));
    await (await pmUsd.balance()).wait();
    console.log('BaseSwap USDC/DAI: ' + fromE6(await baseSwap.netAssetValue()));
    console.log('UniV3         DAI: ' + fromE18(await uniV3Dai.netAssetValue()));
}


main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });

