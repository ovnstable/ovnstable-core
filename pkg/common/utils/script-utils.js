const {fromE18, fromUSDC, toE18, toUSDC} = require("@overnight-contracts/common/utils/decimals");
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

async function showPlatform(platform, blocknumber) {

    let strategyAssets;
    if (blocknumber){
        strategyAssets = await platform.getStrategies({blockNumber: blocknumber});
    }else {
        strategyAssets = await platform.getStrategies();
    }

    let strategiesMapping = (await axios.get('https://app.overnight.fi/api/dapp/strategies')).data;

    const StrategyJson = require("./abi/Strategy.json");

    let items = [];
    for (let i = 0; i < strategyAssets.length; i++) {
        let asset = strategyAssets[i];

        let mapping = strategiesMapping.find(value => value.address === asset);

        let contract = await hre.ethers.getContractAt(StrategyJson.abi, asset, wallet);

        let nav = fromUSDC(await contract.netAssetValue());
        let liq = fromUSDC(await contract.liquidationValue());

        items.push({name: mapping ? mapping.name : asset,netAssetValue: nav, liquidationValue: liq});
    }

    console.table(items);
}


async function showM2M(m2m, usdPlus, blocknumber) {

    let strategyAssets;
    let totalNetAssets;
    if (blocknumber){
        strategyAssets = await m2m.strategyAssets({blockNumber: blocknumber});
        totalNetAssets = await m2m.totalNetAssets({blockNumber: blocknumber});
    }else {
        strategyAssets = await m2m.strategyAssets();
        totalNetAssets = await m2m.totalNetAssets();
    }

    let strategiesMapping = (await axios.get('https://app.overnight.fi/api/dict/strategies')).data;

    let sum = 0;

    let items = [];
    for (let i = 0; i < strategyAssets.length; i++) {
        let asset = strategyAssets[i];

        let mapping = strategiesMapping.find(value => value.address === asset.strategy);

        if (fromUSDC(asset.netAssetValue) === 0){
            continue;
        }

        items.push({name: mapping ? mapping.name : asset.strategy,netAssetValue: fromUSDC(asset.netAssetValue), liquidationValue: fromUSDC(asset.liquidationValue)});
        sum += fromUSDC(asset.netAssetValue);
    }

    console.table(items);
    console.log('Total m2m:  ' + fromUSDC(totalNetAssets.toNumber()));

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


async function upgradeStrategy(strategy, newImplAddress) {

    let timelock = await getContract('OvnTimelockController', 'polygon');


    hre.ethers.provider = new hre.ethers.providers.JsonRpcProvider('http://localhost:8545')
    await hre.network.provider.request({
        method: "hardhat_impersonateAccount",
        params: [timelock.address],
    });

    await checkTimeLockBalance();

    const timelockAccount = await hre.ethers.getSigner(timelock.address);
    await strategy.connect(timelockAccount).upgradeTo(newImplAddress);

    await hre.network.provider.request({
        method: "hardhat_stopImpersonatingAccount",
        params: [timelock.address],
    });

}

async function execTimelock(exec){


    let timelock = await getContract('OvnTimelockController', 'polygon');


    hre.ethers.provider = new hre.ethers.providers.JsonRpcProvider('http://localhost:8545')
    await hre.network.provider.request({
        method: "hardhat_impersonateAccount",
        params: [timelock.address],
    });

    await checkTimeLockBalance();

    const timelockAccount = await hre.ethers.getSigner(timelock.address);

    await exec(timelockAccount);

    await hre.network.provider.request({
        method: "hardhat_stopImpersonatingAccount",
        params: [timelock.address],
    });


}

async function changeWeightsAndBalance(weights){


    let timelock = await getContract('OvnTimelockController', 'polygon');
    let pm = await getContract('PortfolioManager', 'polygon');
    let usdPlus = await getContract('UsdPlusToken', 'polygon');
    let usdc = await getERC20('usdc' );
    let exchange = await getContract('Exchange', 'polygon');
    let m2m = await getContract('Mark2Market', 'polygon');



    console.log('M2M before:')
    await showM2M(m2m, usdPlus);


    hre.ethers.provider = new hre.ethers.providers.JsonRpcProvider('http://localhost:8545')
    await hre.network.provider.request({
        method: "hardhat_impersonateAccount",
        params: [timelock.address],
    });


    await checkTimeLockBalance();

    const timelockAccount = await hre.ethers.getSigner(timelock.address);

    await (await pm.connect(timelockAccount).setStrategyWeights(weights)).wait();
    console.log('setStrategyWeights done()');

    await (await pm.connect(timelockAccount).balance()).wait();
    console.log('balance done()');

    await hre.network.provider.request({
        method: "hardhat_stopImpersonatingAccount",
        params: [timelock.address],
    });

    await usdc.approve(exchange.address, toUSDC(10));
    await exchange.buy(usdc.address, toUSDC(10));

    await usdPlus.approve(exchange.address, toUSDC(10));
    await exchange.redeem(usdc.address, toUSDC(10));

    console.log('M2M after:')
    await showM2M(m2m, usdPlus);


}

async function checkTimeLockBalance(){

    let timelock = await getContract('OvnTimelockController', 'polygon');

    const balance = await hre.ethers.provider.getBalance(timelock.address);

    if (balance.toString() === "0"){
        const tx = {
            from: wallet.address,
            to: timelock.address,
            value: toE18(10),
            nonce: await hre.ethers.provider.getTransactionCount(wallet.address, "latest"),
            gasLimit: 229059,
            gasPrice: await hre.ethers.provider.getGasPrice(),
        }
        await wallet.sendTransaction(tx);
    }

}

module.exports = {
    initWallet: initWallet,
    showM2M: showM2M,
    showPlatform: showPlatform,
    getPrice: getPrice,
    getContract: getContract,
    getERC20: getERC20,
    changeWeightsAndBalance: changeWeightsAndBalance,
    upgradeStrategy: upgradeStrategy,
    execTimelock: execTimelock
}
