const {toAsset, toE18} = require("@overnight-contracts/common/utils/decimals");

const {getContract, showM2M, getCoreAsset, transferETH, initWallet, getWalletAddress} = require("@overnight-contracts/common/utils/script-utils");


async function main() {


    let salesToken = await getContract('SalesToken');

    let wallet = await initWallet();
    await (await salesToken.mint(wallet.address, toE18(10_000)))

    let overflowICO= await getContract('OverflowICO');

    await (await salesToken.approve(overflowICO.address, toE18(10_000))).wait();

    console.log(`Start: ${await overflowICO.started()}`);
    await (await overflowICO.start()).wait();
    console.log(`Start: ${await overflowICO.started()}`);

}


main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });

