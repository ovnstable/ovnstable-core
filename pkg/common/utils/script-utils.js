const {fromE18, fromUSDC} = require("@overnight-contracts/common/utils/decimals");
const axios = require('axios');
const hre = require("hardhat");
const path = require('path'),
    fs = require('fs');
const {DEFAULT} = require("./assets");


let wallet = undefined;
async function initWallet(ethers) {

    if (wallet)
        return wallet;

    let provider = ethers.provider;
    console.log('Provider: ' + provider.connection.url);
    wallet = await new ethers.Wallet(process.env.PK_POLYGON, provider);
    console.log('Wallet: ' + wallet.address);
    const balance = await provider.getBalance(wallet.address);
    console.log('Balance wallet: ' + fromE18(balance));

    return wallet;
}


async function getContract(name, network){

    let ethers = hre.ethers;
    let wallet = await initWallet(ethers);

    let contractJson = JSON.parse(fs.readFileSync(fromDir('../', network+ "/" + name + ".json")));
    return await ethers.getContractAt(contractJson.abi, contractJson.address, wallet);

}

async function getERC20(name){

    let ethers = hre.ethers;
    let wallet = await initWallet(ethers);

    const ERC20 = require("./abi/IERC20.json");

    return await ethers.getContractAt(ERC20, DEFAULT[name], wallet);

}

function fromDir(startPath, filter) {


    if (!fs.existsSync(startPath)) {
        console.log("no dir ", startPath);
        return;
    }

    let files = fs.readdirSync(startPath);
    for (let i = 0; i < files.length; i++) {
        let filename = path.join(startPath, files[i]);
        let stat = fs.lstatSync(filename);
        if (stat.isDirectory()) {
            let value = fromDir(filename, filter); //recurse
            if (value)
                return value;

        } else if (filename.endsWith(filter)) {
            // console.log('Fond: ' + filename)
            return filename;
        }
    }


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
    getContract: getContract,
    getERC20: getERC20
}
