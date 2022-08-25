const {getContract, initWallet, getPrice, showHedgeM2M} = require("@overnight-contracts/common/utils/script-utils");
const {toUSDC} = require("@overnight-contracts/common/utils/decimals");

async function main() {

    let strategy = await getContract('StrategyUsdPlusWmatic');

    console.log('NAV: ' + await strategy.netAssetValue());

    let params = await getPrice();

    let sum = toUSDC(100);

    await (await strategy.stake(sum, params)).wait();

    console.log('NAV: ' + await strategy.netAssetValue());

}


main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
