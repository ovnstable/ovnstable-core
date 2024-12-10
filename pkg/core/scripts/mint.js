const {toAsset} = require("@overnight-contracts/common/utils/decimals");

const {getContract, showM2M, getCoreAsset, transferETH, initWallet, getWalletAddress } = require("@overnight-contracts/common/utils/script-utils");
const { engineSendTxSigned } = require("@overnight-contracts/common/utils/engine");


// engine version
/*
async function main() {
    let wallet = "..."; // backed wallet
    let exchange = await getContract('Exchange');
    let asset = await getCoreAsset();

    let tx = await asset.populateTransaction.approve(exchange.address, toAsset(1));
    await engineSendTxSigned(tx, wallet);
    console.log('Asset approve done');

    tx = await exchange.populateTransaction.buy(asset.address, toAsset(1));
    await engineSendTxSigned(tx, wallet);
    console.log('Exchange.buy done');
}
*/

async function main() {

    let exchange = await getContract('Exchange');
    let asset = await getCoreAsset();

    await showM2M();

    await (await asset.approve(exchange.address, toAsset(1))).wait();
    console.log('Asset approve done');
    await (await exchange.buy(asset.address, toAsset(1))).wait();
    console.log('Exchange.buy done');

    await showM2M();
}


main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });

