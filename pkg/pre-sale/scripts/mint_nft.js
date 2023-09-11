const {toAsset} = require("@overnight-contracts/common/utils/decimals");

const {getContract, showM2M, getCoreAsset, transferETH, initWallet, getWalletAddress} = require("@overnight-contracts/common/utils/script-utils");


async function main() {

    let nft = await getContract('WhitelistNFT');
    await (await nft.safeMints('0x4473D652fb0b40b36d549545e5fF6A363c9cd686', 10)).wait();
}


main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });

