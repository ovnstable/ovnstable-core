const {fromE18, fromUSDC} = require("@overnight-contracts/common/utils/decimals");

async function initWallet(ethers){

    let provider = ethers.provider;
    console.log('Provider: ' + provider.connection.url);
    let wallet = await new ethers.Wallet(process.env.PK_POLYGON, provider);
    console.log('Wallet: ' + wallet.address);
    const balance = await provider.getBalance(wallet.address);
    console.log('Balance wallet: ' + fromE18(balance));

    return wallet;
}

async function showM2M(m2m){

    let strategyAssets = await m2m.strategyAssets();

    let sum = 0;
    for (let i = 0; i < strategyAssets.length; i++) {
        let asset = strategyAssets[i];
        console.log(`${asset.strategy}: ${fromUSDC(asset.netAssetValue)} : ${fromUSDC(asset.liquidationValue)}`)

        sum += fromUSDC(asset.netAssetValue);
    }

    console.log('Total: ' + sum);
}

module.exports = {
    initWallet: initWallet,
    showM2M: showM2M
}
