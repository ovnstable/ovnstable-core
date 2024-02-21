const {toE6, toE18} = require("@overnight-contracts/common/utils/decimals");
const {getContract, showM2M, getCoreAsset, getWalletAddress} = require("@overnight-contracts/common/utils/script-utils");

async function main() {

    let exchange = await getContract('Exchange');

    await (await exchange.setOracleLoss(100, 100000)).wait();
    console.log('setOracleLoss done');

}


main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });

