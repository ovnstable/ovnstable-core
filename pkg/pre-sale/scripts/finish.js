const {toAsset, toE18} = require("@overnight-contracts/common/utils/decimals");

const {getContract, showM2M, getCoreAsset, transferETH, initWallet, getWalletAddress} = require("@overnight-contracts/common/utils/script-utils");


async function main() {

    let overflowICO= await getContract('OverflowICO');

    console.log(`Finished: ${await overflowICO.finished()}`);
    await (await overflowICO.finish()).wait();
    console.log(`Finished: ${await overflowICO.finished()}`);

}


main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });

