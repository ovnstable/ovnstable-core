const Mark2Market = artifacts.require("Mark2Market")

function hex2a(hexx) {
    var hex = hexx.toString();//force conversion
    var str = '';
    for (var i = 0; i < hex.length; i += 2) {
        code = parseInt(hex.substr(i, 2), 16);
        if (code == 0x20
            || (0x30 <= code && code <= 0x7A)
        )
            str += String.fromCharCode(parseInt(hex.substr(i, 2), 16));
    }
    return str;
}

function mapTotalAssetPrices(struct) {
    let totalPrices = {
        assetPrices: [],
        totalUsdcPrice: struct[1]
    };
    for (let assetPrices of struct[0]) {
        totalPrices.assetPrices.push(mapAssetPrices(assetPrices))
    }
    return totalPrices;
}


function mapAssetPrices(struct){
    let assetPrices = {
        asset: struct[0],
        amountInVault: struct[1],
        usdcPriceInVault: struct[2],
        diffToTarget: struct[3],
        diffToTargetSign: struct[4],
        targetIsZero: struct[5],
        usdcPriceDenominator: struct[6],
        usdcSellPrice: struct[7],
        usdcBuyPrice: struct[8],
        decimals: struct[9],
        name: struct[10],
        symbol: struct[11],
    };
    return assetPrices;
} 



module.exports = async function (callback) {
    try {
        let accounts = await web3.eth.getAccounts()
        let userAccount = accounts[0];

        console.log("userAccount: " + userAccount);
        const m2m = await Mark2Market.deployed();

        // callResult = await m2m.assetPrices();
        callResult = await m2m.assetPricesForBalance();
        console.log("--- Logs: ")
        for (let rawLog of callResult.receipt.rawLogs) {
            let data = rawLog.data;
            data = data.replace("0x", "");
            // data = data.replace("00", "");
            console.log(hex2a(data));
        }
        console.log("--- Logs end")

        const fsPromises = require('fs').promises
        // await fsPromises.writeFile('test.txt', JSON.stringify(callResult, null, 2));

        // totalPricesStruct = await m2m.assetPrices.call();
        totalPricesStruct = await m2m.assetPricesForBalance.call();
        console.log("--- totalPrices: ")
        let totalAssetPrices = mapTotalAssetPrices(totalPricesStruct)
        console.log("--- totalPrices end")
        // await fsPromises.writeFile('test2.txt', JSON.stringify(totalPricesStruct, null, 2));
        await fsPromises.writeFile('test3.txt', JSON.stringify(totalAssetPrices, null, 2));

        console.log(`Total usdc: ${totalAssetPrices.totalUsdcPrice}`)
        for (let assetPrices of totalAssetPrices.assetPrices) {
            let p = assetPrices;
            console.log(`${p.symbol} amount: ${p.amountInVault}` +
             ` in USDC: ${p.usdcPriceInVault}`+
             ` Sell: ${p.usdcSellPrice}`+
             ` DEN: ${p.usdcPriceDenominator}`         
             
             )
        }

    } catch (error) {
        console.log(error);
    }
    callback();
}
