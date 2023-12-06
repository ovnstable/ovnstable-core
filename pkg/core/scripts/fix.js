const {toE6, toE18} = require("@overnight-contracts/common/utils/decimals");
const {getContract, showM2M, getCoreAsset, getWalletAddress} = require("@overnight-contracts/common/utils/script-utils");

async function main() {

    let usdPlusToken = await getContract('WrappedUsdPlusToken', 'arbitrum_eth');

    // console.log(`rate:         ${await usdPlusToken.rate()}`);
    await (await usdPlusToken.upgradeTo('0x45c753C213bF565076e73e4165743A8bE94D3d9e')).wait();
    console.log(`rate:         ${await usdPlusToken.rate()}`);

}


main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });

