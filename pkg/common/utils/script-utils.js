const {fromE18, fromUSDC} = require("@overnight-contracts/common/utils/decimals");
const axios = require('axios');

async function initWallet(ethers) {

    let provider = ethers.provider;
    console.log('Provider: ' + provider.connection.url);
    let wallet = await new ethers.Wallet(process.env.PK_POLYGON, provider);
    console.log('Wallet: ' + wallet.address);
    const balance = await provider.getBalance(wallet.address);
    console.log('Balance wallet: ' + fromE18(balance));

    return wallet;
}

async function showM2M(m2m, usdPlus, blocknumber) {

    let strategyAssets;
    if (blocknumber){
        strategyAssets = await m2m.strategyAssets({blockNumber: blocknumber});
    }else {
        strategyAssets = await m2m.strategyAssets();
    }

    let strategiesMapping = (await axios.get('https://app.overnight.fi/api/dapp/strategies')).data;

    let sum = 0;

    let items = [];
    for (let i = 0; i < strategyAssets.length; i++) {
        let asset = strategyAssets[i];

        let mapping = strategiesMapping.find(value => value.address === asset.strategy);


        items.push({name: mapping ? mapping.name : asset.strategy,netAssetValue: fromUSDC(asset.netAssetValue), liquidationValue: fromUSDC(asset.liquidationValue)});
        sum += fromUSDC(asset.netAssetValue);
    }

    console.table(items);
    console.log('Total m2m:  ' + sum);

    if (usdPlus){

        let totalUsdPlus;
        if (blocknumber){
            totalUsdPlus = (await usdPlus.totalSupply({blockNumber: blocknumber})) /10 ** 6
        }else {
            totalUsdPlus = (await usdPlus.totalSupply()) /10 ** 6
        }
        console.log('Total USD+: ' + totalUsdPlus);
    }
}


async function getPrice(){
    let value = process.env.GAS_PRICE.toString() + "000000000";
    return {maxFeePerGas: value, maxPriorityFeePerGas: value};
}

module.exports = {
    initWallet: initWallet,
    showM2M: showM2M,
    getPrice: getPrice,
}
