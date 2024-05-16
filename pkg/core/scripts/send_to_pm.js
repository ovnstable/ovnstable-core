const {toAsset, toE6} = require("@overnight-contracts/common/utils/decimals");
const {
    getContract,
    getCoreAsset,
} = require("@overnight-contracts/common/utils/script-utils");

async function main() {

    let dev = "0xcd8562CD85fD93C7e2E80B4Cf69097E5562a76f9";
    let pm = await getContract('PortfolioManager', 'optimism');
    let asset = await getCoreAsset();
    let bal = await asset.balanceOf(dev);
    console.log("bal", bal.toString());
    await asset.transfer(pm.address, bal);
    let bal2 = await asset.balanceOf(pm.address);
    console.log('Done: PM balance:', bal2.toString());
}


main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });

