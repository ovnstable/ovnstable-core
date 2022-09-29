const {fromE18, fromE6, toE18, toE6} = require("@overnight-contracts/common/utils/decimals");
const axios = require('axios');
const hre = require("hardhat");
const path = require('path'),
    fs = require('fs');
const {DEFAULT} = require("./assets");
const {evmCheckpoint, evmRestore} = require("@overnight-contracts/common/utils/sharedBeforeEach");
const BN = require('bn.js');
const {core} = require("./core");
const {fromAsset, toAsset } = require("./decimals");

let ethers = require('hardhat').ethers;

let wallet = undefined;
async function initWallet() {

    if (wallet)
        return wallet;

    let provider = ethers.provider;
    console.log('Provider: ' + provider.connection.url);
    wallet = await new ethers.Wallet(process.env.PK_POLYGON, provider);
    console.log('Wallet: ' + wallet.address);
    const balance = await provider.getBalance(wallet.address);
    console.log('Balance wallet: ' + fromE18(balance.toString()));

    return wallet;
}
async function deploySection(exec){

    if (hre.ovn === undefined)
        hre.ovn = {};

    if (!hre.ovn.noDeploy){

        let strategyName = hre.ovn.tags;

        try {
            await exec(strategyName);
            console.log(`[${strategyName}] deploy done`)
        } catch (e) {
            console.error(`[${strategyName}] deploy fail: ` + e);
        }
    }
}

async function settingSection(exec){

    if (hre.ovn === undefined)
        hre.ovn = {};

    if (hre.ovn.setting){

        let strategyName = hre.ovn.tags;
        try {
            let strategy = await ethers.getContract(strategyName);

            let pm = await getContract('PortfolioManager', process.env.STAND);
            await (await strategy.setPortfolioManager(pm.address)).wait();

            await exec(strategy);
            console.log(`[${strategyName}] setting done`)
        } catch (e) {
            console.error(`[${strategyName}] setting fail: ` + e);
        }

    }
}

async function getContract(name, network){

    if (!network)
        network = process.env.STAND;

    let ethers = hre.ethers;
    let wallet = await initWallet(ethers);

    try {
        let searchPath = fromDir(require('app-root-path').path, path.join(network, name + ".json"));
        let contractJson = JSON.parse(fs.readFileSync(searchPath));
        return await ethers.getContractAt(contractJson.abi, contractJson.address, wallet);
    } catch (e) {
        console.error(`Error: Could not find a contract named [${name}] in network: [${network}]`);
        throw new Error(e);
    }

}

async function getAbi(name){

    let searchPath = fromDir(require('app-root-path').path, path.join(name + ".json"));
    return JSON.parse(fs.readFileSync(searchPath)).abi;

}

async function getStrategy(address){

    let ethers = hre.ethers;
    let wallet = await initWallet(ethers);

    const StrategyJson = require("./abi/Strategy.json");
    return await ethers.getContractAt(StrategyJson.abi, address, wallet);

}

async function getERC20(name, wallet){

    let ethers = hre.ethers;

    if (!wallet){
        wallet = await initWallet(ethers);
    }

    const ERC20 = require("./abi/IERC20.json");

    return await ethers.getContractAt(ERC20, DEFAULT[name], wallet);

}

async function getCoreAsset() {


    if (process.env.STAND === 'bsc') {
        return await getERC20('busd');
    } else if (process.env.STAND === 'bsc_usdc') {
        return await getERC20('usdc');
    } else if (process.env.STAND === 'bsc_usdt') {
        return await getERC20('usdt');
    }else if (process.env.STAND === 'optimism_dai') {
        return await getERC20('dai');
    } else {
        return await getERC20('usdc');
    }

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

        let nav = fromE6(await contract.netAssetValue());
        let liq = fromE6(await contract.liquidationValue());

        items.push({name: mapping ? mapping.name : asset,netAssetValue: nav, liquidationValue: liq});
    }

    console.table(items);
}


async function getStrategyMapping(){

    let url;
    let fromAsset = fromE6;
    switch(process.env.STAND){
        case "avalanche":
            url = "https://avax.overnight.fi/api/dict/strategies";
            break;
        case "bsc":
            url = "https://bsc.overnight.fi/api/dict/strategies";
            fromAsset = fromE18;
            break;
        case "polygon":
            url = "https://app.overnight.fi/api/dict/strategies";
            break;
        case "polygon_dev":
            url = "https://dev.overnight.fi/api/dict/strategies";
            break;
        case "optimism":
        case "optimism_dai":
            url = "https://op.overnight.fi/api/dict/strategies";
            break;
        case "bsc_usdc":
            url = "https://api.overnight.fi/bsc_usdc/dict/strategies";
            break;
        case "bsc_usdt":
            url = "https://api.overnight.fi/bsc_usdt/dict/strategies";
            break;
        default:
            throw Error('Unknown STAND: ' + process.env.STAND);
    }

    let strategiesMapping = [];
    try {
        strategiesMapping = (await axios.get(url)).data;
    } catch (e) {
        console.log('Error: ' + e.message);
    }

    return strategiesMapping;
}

async function showM2M(blocknumber) {

    let m2m = await getContract('Mark2Market', process.env.STAND);
    let usdPlus = await getContract('UsdPlusToken', process.env.STAND);
    let pm = await getContract('PortfolioManager', process.env.STAND);

    let strategyAssets;
    let totalNetAssets;
    let strategyWeights;
    if (blocknumber){
        strategyAssets = await m2m.strategyAssets({blockTag: blocknumber});
        totalNetAssets = await m2m.totalNetAssets({blockTag: blocknumber});
        strategyWeights = await pm.getAllStrategyWeights({ blockTag: blocknumber });
    }else {
        strategyAssets = await m2m.strategyAssets();
        totalNetAssets = await m2m.totalNetAssets();
        strategyWeights = await pm.getAllStrategyWeights();
    }


    let strategiesMapping = await getStrategyMapping();

    let sum = 0;

    let items = [];
    for (let i = 0; i < strategyAssets.length; i++) {
        let asset = strategyAssets[i];
        let weight = strategyWeights[i];

        let mapping = strategiesMapping.find(value => value.address === asset.strategy);

        items.push(
            {
                name: mapping ? mapping.name : asset.strategy,
                netAssetValue: fromAsset(asset.netAssetValue.toString()),
                liquidationValue: fromAsset(asset.liquidationValue.toString()),
                targetWeight:  weight.targetWeight.toNumber() / 1000,
                maxWeight: weight.maxWeight.toNumber() / 1000,
                enabled: weight.enabled,
                enabledReward: weight.enabledReward
            });
        sum += parseFloat(fromAsset(asset.netAssetValue.toString()));
    }

    for (let i = 0; i < items.length; i++) {
        items[i].currentWeight = Number((100 * parseFloat(items[i].netAssetValue) / sum).toFixed(3));
    }

    console.table(items);
    console.log('Total m2m:  ' + fromAsset(totalNetAssets.toString()));

    if (usdPlus){

        let totalUsdPlus;
        if (blocknumber){
            totalUsdPlus = fromE6(await usdPlus.totalSupply({blockTag: blocknumber}));
        }else {
            totalUsdPlus = fromE6(await usdPlus.totalSupply());
        }
        console.log('Total USD+: ' + totalUsdPlus);
    }

    console.log(`current LI: ${(await usdPlus.liquidityIndex()).toString()}`)
}


async function getPrice(){
    let value = process.env.GAS_PRICE.toString() + "000000000";

    let params = {maxFeePerGas: value, maxPriorityFeePerGas: value};

    if (process.env.ETH_NETWORK === 'POLYGON')
        params.gasLimit = 15000000;
    else if(process.env.ETH_NETWORK === 'AVALANCHE')
        params.gasLimit = 8000000;
    else if (process.env.ETH_NETWORK === 'BSC'){
        params = {gasPrice: "5000000000", gasLimit:  9000000}; // BSC gasPrice always 5 GWEI
    }else if (process.env.ETH_NETWORK === "OPTIMISM"){
        params = {gasPrice: "1000000000", gasLimit: 8000000}; // gasPrice 0.001
    }

    return params;
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


    let timelock = await getContract('OvnTimelockController' );


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

async function convertWeights(weights){


    let totalWeight = 0;
    for (const weight of weights) {
        totalWeight += weight.targetWeight * 1000;
    }
    console.log(`totalWeight: ${totalWeight}`)

    if (totalWeight !== 100000) {
        console.log(`Total weight not 100000`)
        return
    }

    weights = weights.map(value => {
        delete value.name
        value.targetWeight = value.targetWeight * 1000;
        value.maxWeight = value.maxWeight * 1000;

        return value;
    })

    return weights;
}

async function changeWeightsAndBalance(weights){


    await evmCheckpoint('Before');

    let timelock = await getContract('OvnTimelockController' );
    let pm = await getContract('PortfolioManager' );
    let usdPlus = await getContract('UsdPlusToken' );
    let usdc = await getERC20('usdc' );
    let exchange = await getContract('Exchange');

    console.log('M2M before:')
    await showM2M();


    hre.ethers.provider = new hre.ethers.providers.JsonRpcProvider('http://localhost:8545')
    await hre.network.provider.request({
        method: "hardhat_impersonateAccount",
        params: [timelock.address],
    });


    await checkTimeLockBalance();

    const timelockAccount = await hre.ethers.getSigner(timelock.address);

    await (await pm.connect(timelockAccount).grantRole(await pm.PORTFOLIO_AGENT_ROLE(), timelockAccount.address));

    await (await pm.connect(timelockAccount).setStrategyWeights(weights)).wait();
    console.log('setStrategyWeights done()');

    await (await pm.connect(timelockAccount).balance()).wait();
    console.log('balance done()');

    await hre.network.provider.request({
        method: "hardhat_stopImpersonatingAccount",
        params: [timelock.address],
    });


    if (fromE6(await usdc.balanceOf(wallet.address)) > 10){
        await usdc.approve(exchange.address, toE6(10));
        await exchange.buy(usdc.address, toE6(10));

        await usdPlus.approve(exchange.address, toE6(10));
        await exchange.redeem(usdc.address, toE6(10));
    }

    console.log('M2M after:')
    await showM2M();

    await evmRestore('Before');

}

async function checkTimeLockBalance(){

    let timelock = await getContract('OvnTimelockController' );

    const balance = await hre.ethers.provider.getBalance(timelock.address);

    if (new BN(balance.toString()).lt(new BN("10000000000000000000"))){
        await transferETH(1, timelock.address);
    }

}

async function getChainId(){


    switch (process.env.ETH_NETWORK){
        case "POLYGON":
            return 137;
        case "BSC":
            return 56;
        case "AVALANCHE":
            return 43114;
        case "FANTOM":
            return 250;
        case "OPTIMISM":
            return 10;
        default:
            throw new Error("Unknown chain");
    }
}


async function showHedgeM2M() {

    let wallet = await initWallet();

    let usdPlus = await getContract('UsdPlusToken');
    let ets = await getContract('RebaseToken' + process.env.ETS);
    let strategy = await getContract('Strategy' + process.env.ETS);

    console.log('User balances:')
    let user = [];
    user.push({name: 'Ets', value: fromE6(await ets.balanceOf(wallet.address))});
    user.push({name: 'usdPlus', value: fromE6(await usdPlus.balanceOf(wallet.address))});

    console.table(user);

    console.log('ETS balances:')
    let values = [];
    values.push({name: 'Total Ets', value: fromE6(await ets.totalSupply())});
    values.push({name: 'Total NAV', value: fromE6((await strategy.netAssetValue()).toString())});
    values.push({name: 'Liq index', value: (await ets.liquidityIndex()).toString()});
    values.push({name: 'HF', value: (await strategy.currentHealthFactor()).toString()});

    console.table(values)

    let items = await strategy.balances();

    let names = ['borrowToken', 'collateralAsset', 'poolToken', 'poolUsdPlus', 'freeUsdPlus', 'freeAsset', 'freeToken']
    let arrays = [];
    for (let i = 0; i < items.length; i++) {

        let item = items[i];

        arrays.push({
            asset: item[0],
            name: names[i],
            amountUSD: fromE6(item[1].toString()),
            amount: item[2].toString(),
            borrowed: item[3].toString()
        })

    }

    console.table(arrays);
}


async function getDevWallet(){

    let provider = ethers.provider;
    return await new ethers.Wallet('0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80', provider);
}


async function transferETH(amount, to) {

    let privateKey = "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80"; // Ganache key
    let walletWithProvider = new ethers.Wallet(privateKey, hre.ethers.provider);

    let price = await getPrice();
    await walletWithProvider.sendTransaction({
        to: to,
        value: ethers.utils.parseEther(amount+""),
        ...price
    });

}


async function transferWTC(amount, to) {


    //work only for Optimism
    // This address has WBTC
    let address = '0xa4cff481cd40e733650ea76f6f8008f067bf6ef3';

    await transferETH(1, address);

    hre.ethers.provider = new hre.ethers.providers.JsonRpcProvider('http://localhost:8545')
    await hre.network.provider.request({
        method: "hardhat_impersonateAccount",
        params: [address],
    });


    const account = await hre.ethers.getSigner(address);

    let wbtc = await getERC20('wbtc');

    await wbtc.connect(account).transfer(to, await wbtc.balanceOf(account.address));

    await hre.network.provider.request({
        method: "hardhat_stopImpersonatingAccount",
        params: [account.address],
    });


    console.log('Balance WBTC: ' + await wbtc.balanceOf(to));
}

async function transferUSDPlus(amount, to){

    let usdPlus = await getContract('UsdPlusToken');

    await execTimelock(async (timelock)=>{
        let exchange = await usdPlus.exchange();

        await usdPlus.connect(timelock).setExchanger(timelock.address);
        await usdPlus.connect(timelock).mint(to, toAsset(amount));
        await usdPlus.connect(timelock).setExchanger(exchange);
    });

    console.log('Balance USD+: ' + fromAsset(await usdPlus.balanceOf(to)));
}

async function transferDAI(to) {

    let address;
    switch (process.env.ETH_NETWORK){
        case "OPTIMISM":
            address = '0x441b02540b16b22d64a5be8d3a4dcf9a4e0efa98';
            break
        default:
            throw new Error('Unknown mapping ETH_NETWORK');
    }

    await transferETH(1, address);

    await hre.network.provider.request({
        method: "hardhat_impersonateAccount",
        params: [address],
    });

    const account = await hre.ethers.getSigner(address);

    let token = await getERC20('dai');

    await token.connect(account).transfer(to, await token.balanceOf(account.address));

    await hre.network.provider.request({
        method: "hardhat_stopImpersonatingAccount",
        params: [account.address],
    });


}


async function transferWBTC(amount, to) {

    //work only for Optimism
    // This address has WBTC
    let address = '0xa4cff481cd40e733650ea76f6f8008f067bf6ef3';
    switch (process.env.ETH_NETWORK){
        case "OPTIMISM":
            address = '0xa4cff481cd40e733650ea76f6f8008f067bf6ef3';
            break
        default:
            throw new Error('Unknown mapping ETH_NETWORK');
    }

    await transferETH(1, address);

    hre.ethers.provider = new hre.ethers.providers.JsonRpcProvider('http://localhost:8545')
    await hre.network.provider.request({
        method: "hardhat_impersonateAccount",
        params: [address],
    });


    const account = await hre.ethers.getSigner(address);

    let wbtc = await getERC20('wbtc');

    await wbtc.connect(account).transfer(to, await wbtc.balanceOf(account.address));

    await hre.network.provider.request({
        method: "hardhat_stopImpersonatingAccount",
        params: [account.address],
    });


    console.log('Balance WBTC: ' + await wbtc.balanceOf(to));
}

module.exports = {
    getStrategyMapping: getStrategyMapping,
    getChainId: getChainId,
    convertWeights: convertWeights,
    initWallet: initWallet,
    getDevWallet: getDevWallet,
    transferETH: transferETH,
    transferDAI: transferDAI,
    transferWTC: transferWTC,
    transferUSDPlus: transferUSDPlus,
    transferWBTC: transferWBTC,
    showM2M: showM2M,
    showPlatform: showPlatform,
    showHedgeM2M: showHedgeM2M,
    getPrice: getPrice,
    getContract: getContract,
    getERC20: getERC20,
    getCoreAsset: getCoreAsset,
    getStrategy: getStrategy,
    changeWeightsAndBalance: changeWeightsAndBalance,
    upgradeStrategy: upgradeStrategy,
    execTimelock: execTimelock,
    getAbi: getAbi,
    deploySection: deploySection,
    settingSection: settingSection,
    checkTimeLockBalance: checkTimeLockBalance,
}
