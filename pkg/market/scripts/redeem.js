const {getContract, initWallet, getPrice, showHedgeM2M} = require("@overnight-contracts/common/utils/script-utils");

async function main() {

    let wallet = await initWallet();

    let exchanger = await getContract('HedgeExchangerUsdPlusWmatic');
    let rebase = await getContract('RebaseTokenUsdPlusWmatic');

    await showHedgeM2M();

    let balance = await rebase.balanceOf(wallet.address);
    let params = await getPrice();
    params.gasLimit = 15000000;
    await (await rebase.approve(exchanger.address, balance, params)).wait();
    await (await exchanger.redeem(balance, params)).wait();

    await showHedgeM2M();

}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
