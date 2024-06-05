const { getContract, getPrice, initWallet, execTimelock, transferETH } = require("@overnight-contracts/common/utils/script-utils");
const { fromE6 } = require("@overnight-contracts/common/utils/decimals");

async function main() {

    // let wallet = await initWallet();
    // await transferETH(1, wallet.address);

    let usdPlus = await getContract('UsdPlusToken', 'linea');

    // console.log('rebasingCreditsPerTokenHighres:   ' + await usdPlus.rebasingCreditsPerTokenHighres());

    // console.log("usdPlusBalanceBefore", (await usdPlus.balanceOf("0xae5c67CeB16B4851F169EC1C65F405D7e6308b90", { blockTag: 5174395 })).toString())

    // console.log("usdPlusBalanceAfter", (await usdPlus.balanceOf("0xae5c67CeB16B4851F169EC1C65F405D7e6308b90",)).toString())

    let usdtPlus = await getContract('UsdPlusToken', 'linea_usdt');

    console.log("pools balances should be usd+")
    console.log({
        "0xbE23da11fbF9dA0F7C13eA73A4bB511b9Bc00177": (await usdPlus.balanceOf("0xbE23da11fbF9dA0F7C13eA73A4bB511b9Bc00177",)).toString(),
        "0x58aacbccaec30938cb2bb11653cad726e5c4194a": (await usdPlus.balanceOf("0x58aacbccaec30938cb2bb11653cad726e5c4194a",)).toString(),
        "0xc5f4c5c2077bbbac5a8381cf30ecdf18fde42a91": (await usdPlus.balanceOf("0xc5f4c5c2077bbbac5a8381cf30ecdf18fde42a91",)).toString(),
        "0x93b6d53d8a33c92003D0c41065cb2842934C2619": (await usdPlus.balanceOf("0x93b6d53d8a33c92003D0c41065cb2842934C2619",)).toString(),
        "0x6F501662A76577FBB3Bb230Be5E8e69D41d8c711": (await usdPlus.balanceOf("0x6F501662A76577FBB3Bb230Be5E8e69D41d8c711",)).toString(),
        "0x2c5455EC697254B9c649892eEd425126791e334a": (await usdPlus.balanceOf("0x2c5455EC697254B9c649892eEd425126791e334a",)).toString(),
        "0xae5c67CeB16B4851F169EC1C65F405D7e6308b90 _ user": (await usdPlus.balanceOf("0xae5c67CeB16B4851F169EC1C65F405D7e6308b90")).toString()
    })

    console.log("pools balances and user last should be usdt+")
    console.log({
        "0xbE23da11fbF9dA0F7C13eA73A4bB511b9Bc00177": (await usdtPlus.balanceOf("0xbE23da11fbF9dA0F7C13eA73A4bB511b9Bc00177",)).toString(),
        "0x58aacbccaec30938cb2bb11653cad726e5c4194a": (await usdtPlus.balanceOf("0x58aacbccaec30938cb2bb11653cad726e5c4194a",)).toString(),
        "0xc5f4c5c2077bbbac5a8381cf30ecdf18fde42a91": (await usdtPlus.balanceOf("0xc5f4c5c2077bbbac5a8381cf30ecdf18fde42a91",)).toString(),
        "0x93b6d53d8a33c92003D0c41065cb2842934C2619": (await usdtPlus.balanceOf("0x93b6d53d8a33c92003D0c41065cb2842934C2619",)).toString(),
        "0x6F501662A76577FBB3Bb230Be5E8e69D41d8c711": (await usdtPlus.balanceOf("0x6F501662A76577FBB3Bb230Be5E8e69D41d8c711",)).toString(),
        "0x2c5455EC697254B9c649892eEd425126791e334a": (await usdtPlus.balanceOf("0x2c5455EC697254B9c649892eEd425126791e334a",)).toString(),
        "0x1234561fEd41DD2D867a038bBdB857f291864225 _user": (await usdPlus.balanceOf("0x1234561fEd41DD2D867a038bBdB857f291864225")).toString()
    })
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
