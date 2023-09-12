const {toAsset} = require("@overnight-contracts/common/utils/decimals");

const {getContract, showM2M, getCoreAsset, transferETH, initWallet, getWalletAddress} = require("@overnight-contracts/common/utils/script-utils");


async function main() {

    let overflowICO= await getContract('OverflowICO');

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

