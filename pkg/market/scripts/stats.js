const { verify } = require("@overnight-contracts/common/utils/verify-utils");
const {getContract, initWallet, getPrice} = require("@overnight-contracts/common/utils/script-utils");
const {toUSDC, fromUSDC} = require("@overnight-contracts/common/utils/decimals");

async function main() {

    let wallet = await initWallet();

    let usdPlus = await getContract('UsdPlusToken', 'polygon');
    let strategy = await getContract('StrategyUsdPlusWmatic', 'polygon_dev');
    let rebase = await getContract('RebaseTokenUsdPlusWmatic', 'polygon_dev');

    console.log("Rebase: " + fromUSDC(await rebase.balanceOf(wallet.address)))
    console.log("usdPlus: " + fromUSDC(await usdPlus.balanceOf(wallet.address)))
    console.log("nav: " + fromUSDC(await strategy.netAssetValue()))
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
