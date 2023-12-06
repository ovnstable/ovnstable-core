const {toE6, toE18} = require("@overnight-contracts/common/utils/decimals");
const {getContract, showM2M, getCoreAsset, getWalletAddress} = require("@overnight-contracts/common/utils/script-utils");

async function main() {

    let usdPlusToken = await getContract('UsdPlusToken', 'localhost');
    
    let poolAddress = "0x77cA2ddfd61D1D5E5d709cF07549FEC3E2d80315";

    let amount = await usdPlusToken.balanceOf(poolAddress);
    console.log('OldBalance', amount.toString());

    await (await usdPlusToken.fix()).wait();
    
    amount = await usdPlusToken.balanceOf(poolAddress);
    console.log('NewBalance', amount.toString());
}


main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });

