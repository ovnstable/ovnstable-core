const { fromE18, fromE6, toE18, toE6, fromE8 } = require("@overnight-contracts/common/utils/decimals");
const axios = require('axios');
const hre = require("hardhat");
const path = require('path'),
    fs = require('fs');
const { ARBITRUM, BASE, BSC, OPTIMISM, POLYGON, LINEA, ZKSYNC, BLAST, getDefault, getAsset, COMMON } = require("./assets");
const { evmCheckpoint, evmRestore } = require("@overnight-contracts/common/utils/sharedBeforeEach");
const BN = require('bn.js');
const { fromAsset, toAsset, fromUsdPlus } = require("./decimals");
const { Wallet, Provider } = require("zksync-web3");
const { Deployer } = require("@matterlabs/hardhat-zksync-deploy");
const { BigNumber } = require("ethers");
const { isZkSync } = require("./network");
const { updateFeeData } = require("./hardhat-ovn");

let ethers = require('hardhat').ethers;

const DIAMOND_STRATEGY = require('./abi/DiamondStrategy.json');
const {Roles} = require("./roles");

let wallet = undefined;
async function initWallet() {

    updateFeeData(hre);

    if (wallet) {
        return wallet;
    }

    let provider = ethers.provider;

    if (process.env.STAND === 'zksync') {
        provider = new Provider("http://localhost:8011");
        wallet = new Wallet(process.env['PK']);
        wallet = (new Deployer(hre, wallet)).zkWallet;
    } else {
        networkName = process.env.STAND;
        wallet = await new ethers.Wallet(process.env['PK'], provider);
    }

    console.log('[User] Wallet: ' + wallet.address);
    const balance = await provider.getBalance(wallet.address);
    console.log('[User] Balance wallet: ' + fromE18(balance.toString()));


    return wallet;
}


async function findEvent(receipt, abi, eventName) {


    for (let value of receipt.logs) {
        try {
            let log = abi.interface.parseLog(value);

            if (log.name === eventName) {
                return log;
            }
        } catch (e) {
        }
    }

    return null;

}

async function getWalletAddress() {

    let wallet = await initWallet();

    if (wallet)
        return wallet.address;
    else
        throw new Error('Wallet not found');
}

async function deploySection(exec) {

    if (hre.ovn === undefined)
        hre.ovn = {};

    if (!hre.ovn.noDeploy) {

        let strategyName = hre.ovn.tags;

        try {
            await exec(strategyName);
            console.log(`[${strategyName}] deploy done`)
        } catch (e) {
            console.error(`[${strategyName}] deploy fail: ` + e);
        }
    }
}

async function settingSection(id, exec) {

    if (hre.ovn === undefined)
        hre.ovn = {};

    if (hre.ovn.setting) {

        let strategyName = hre.ovn.tags;
        try {
            let strategy = await ethers.getContract(strategyName);

            // Ethers by default connect default wallet
            // For ZkSync we should use special zkSync wallet object
            // ZkWallet by default return from initWallet()
            if (isZkSync()) {
                strategy = strategy.connect(await initWallet())
            }

            if (hre.ovn.gov) {
                let timelock = await getContract('AgentTimelock');

                if (isZkSync()) {
                    hre.ethers.provider = new hre.ethers.providers.JsonRpcProvider('http://localhost:8011')
                } else {
                    hre.ethers.provider = new hre.ethers.providers.JsonRpcProvider('http://localhost:8545')
                }
                await hre.network.provider.request({
                    method: "hardhat_impersonateAccount",
                    params: [timelock.address],
                });
                const timelockAccount = await hre.ethers.getSigner(timelock.address);
                strategy = strategy.connect(timelockAccount);
            }

            console.log('Try to SetStrategyParams');
            let pm = await getContract('PortfolioManager', process.env.STAND);
            let roleManager = await getContract('RoleManager', process.env.STAND);
            await (await strategy.setStrategyParams(pm.address, roleManager.address)).wait();
            await exec(strategy);
            try {
                await setDepositor(strategyName, strategy);
            } catch (e) {
                console.log(`SetDepositor fail: ${e}`);
            }

            try {
                await addStrategyToApi(strategy, id);
            } catch (e) {
                console.log(`Add strategy to API error: ${e}`);
            }
            console.log(`[${strategyName}] setting done`)
        } catch (e) {
            console.error(`[${strategyName}] setting fail: ` + e);
        }

    }
}


async function setDepositor(strategyName, strategy){

    if (strategyName.includes('Smm') || strategyName.includes('Ets')){
        console.log('Try to setDepositor');
        let wallet = await initWallet();
        let diamondStrategy = await ethers.getContractAt(DIAMOND_STRATEGY, await strategy.strategy(), wallet);

        if (await diamondStrategy.hasRole(Roles.DEFAULT_ADMIN_ROLE, wallet.address)){
            await (await diamondStrategy.setDepositor(strategy.address));
            console.log(`diamondStrategy.setDepository(${strategy.address})`);
        }else {
            console.warn(`Cannot setDepositor -> wallet: ${wallet.address} not has ADMIN role on DiamondStrategy: ${diamondStrategy.address}`);
        }
    }
}

async function addStrategyToApi(strategy, id){
    console.log(`Try to add strategy [${id}] to API`);

    if (hre.network.name === 'localhost' || hre.network.name === 'hardhat'){
        console.log('Ignore add strategy to API for localhost network');
        return;
    }


    let explorerAddress;
    if (strategy.strategy){
        explorerAddress = await strategy.strategy();
    }

    let type;
    if (id.includes('Smm') || id.includes('Ets')) {
        type = 'ETS';
    }else if (id.includes('Sper')){
        type = 'SPER';
    }else {
        type = 'CORE';
    }


    let usdPlus = await getContract('UsdPlusToken');

    let request = {
        id: id,
        chain: process.env.ETH_NETWORK.toUpperCase(),
        strategyAddress: strategy.address,
        explorerAddress: explorerAddress,
        type: type,
        token: await usdPlus.symbol(),
    }

    console.log(`Request to DEV API: ${JSON.stringify(request)}`);

    let url = getDevApiUrl() + "/dev/strategy";

    console.log(`URL: ${url}`);

    try {
        await axios.post(url, request, {
            headers: {
                'Content-Type': 'application/json',
                'Authorization': getDevAuthApiKey()
            },
        });
        console.log(`Strategy ${id} success added to API`);
    } catch (e) {
        console.error(`Cannot add strategy to API: ${e}`);
    }

}


function getDevApiUrl(){

    let devApiUrl = process.env.DEV_API_URL;

    if (devApiUrl){
        return devApiUrl;
    }else {
        throw new Error('DEV_API_URL is not defined');
    }
}

function getDevAuthApiKey(){

    let devApiKey = process.env.DEV_AUTH_API_KEY;

    if (devApiKey){
        return devApiKey;
    }else {
        throw new Error('DEV_AUTH_API_KEY is not defined');
    }
}

/**
 * Allow check address is contract or not
 * @returns bool true/false is contract
 *
 */

async function isContract(address) {

    try {
        const code = await ethers.provider.getCode(address);
        if (code !== '0x') return true;
    } catch (error) {
        return false;
    }
}

async function getContract(name, network) {

    if (!network) network = process.env.STAND;

    let ethers = hre.ethers;
    let wallet = await initWallet();

    try {
        let searchPath = fromDir(require('app-root-path').path, path.join(network, name + ".json"));
        if (!searchPath)  searchPath = fromDir(require('app-root-path').path, path.join('localhost', name + ".json"));
        let contractJson = JSON.parse(fs.readFileSync(searchPath));
        return await ethers.getContractAt(contractJson.abi, contractJson.address, wallet);
    } catch (e) {
        console.error(`Error: Could not find a contract named [${name}] in network: [${network}]`);
        throw new Error(e);
    }

}

async function getContractByAddress(name, address, network) {

    if (!network)
        network = process.env.STAND;

    let ethers = hre.ethers;
    let wallet = await initWallet();

    try {
        let searchPath = fromDir(require('app-root-path').path, path.join(network, name + ".json"));
        let contractJson = JSON.parse(fs.readFileSync(searchPath));
        return await ethers.getContractAt(contractJson.abi, address, wallet);
    } catch (e) {
        console.error(`Error: Could not find a contract named [${name}] in network: [${network}]`);
        throw new Error(e);
    }

}

async function getBytecode(name, network) {

    if (!network)
        network = process.env.STAND;

    try {
        let searchPath = fromDir(require('app-root-path').path, path.join(network, name + ".json"));
        let contractJson = JSON.parse(fs.readFileSync(searchPath));
        return contractJson.bytecode;
    } catch (e) {
        console.error(`Error: Could not find a contract named [${name}] in network: [${network}]`);
        throw new Error(e);
    }

}


async function getImplementation(name, network) {

    if (!network)
        network = process.env.STAND;

    let contractJson;
    try {
        let searchPath = fromDir(require('app-root-path').path, path.join(network, name + ".json"));
        contractJson = JSON.parse(fs.readFileSync(searchPath));
    } catch (e) {
        console.error(`Error: Could not find a contract named [${name}] in network: [${network}]`);
        throw new Error(e);
    }

    if (contractJson.implementation) {
        console.log(`Found implementation: ${contractJson.implementation} for contract: ${name} in network: ${network}`);
        return contractJson.implementation;
    } else {
        throw new Error(`Error: Could not find a implementation for contract [${name}] in network: [${network}]`);
    }
}

async function getAbi(name, network) {

    if (!network)
        network = process.env.STAND;

    let searchPath = fromDir(require('app-root-path').path, path.join("/" + name + ".json"));
    return JSON.parse(fs.readFileSync(searchPath)).abi;

}

async function getStrategy(address) {

    let ethers = hre.ethers;
    let wallet = await initWallet();

    const StrategyJson = require("./abi/Strategy.json");
    return await ethers.getContractAt(StrategyJson.abi, address, wallet);

}

async function getERC20(name, wallet) {

    let ethers = hre.ethers;

    if (!wallet) {
        wallet = await initWallet();
    }

    const ERC20 = require("./abi/IERC20.json");

    return await ethers.getContractAt(ERC20, getAsset(name), wallet);

}

async function getERC20ByAddress(address, wallet) {

    let ethers = hre.ethers;

    if (!wallet) {
        wallet = await initWallet();
    }

    const ERC20 = require("./abi/IERC20.json");

    return await ethers.getContractAt(ERC20, address, wallet);

}

async function getCoreAsset(stand = process.env.STAND) {

    if (stand === 'arbitrum_dai'
        || stand === 'base_dai'
        || stand === 'optimism_dai'
    ) {
        return await getERC20('dai');

    } else if (stand === 'arbitrum_usdt'
        || stand === 'bsc_usdt'
        || stand === 'linea_usdt'
    ) {
        return await getERC20('usdt');

    } else if (stand === 'base') {
        return await getERC20('usdbc');

    } else if (stand === 'arbitrum_eth') {
        return await getERC20('weth');

    } else if (stand === 'base_usdc') {
        return await getERC20('usdc');

    } else if (stand === 'blast') {
        return await getERC20('usdb');

    } else if (stand === 'blast_usdc') {
        return await getERC20('usdb');

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



async function getStrategyMapping() {

    let url;
    let fromAsset = fromE6;
    switch (process.env.STAND) {
        case "avalanche":
            url = "https://avax.overnight.fi/api/dict/strategies";
            break;
        case "arbitrum":
            url = "https://api.overnight.fi/arbitrum/usd+/dict/strategies";
            break
        case "arbitrum_dai":
            url = "https://api.overnight.fi/arbitrum/dai+/dict/strategies";
            break;
        case "arbitrum_eth":
            url = "https://api.overnight.fi/arbitrum/eth+/dict/strategies";
            break;
        case "arbitrum_usdt":
            url = "https://api.overnight.fi/arbitrum/usdt+/dict/strategies";
            break;
        case "bsc":
            url = "https://api.overnight.fi/bsc/usd+/dict/strategies";
            break;
        case "bsc_usdt":
            url = "https://api.overnight.fi/bsc/usdt+/dict/strategies";
            fromAsset = fromE18;
            break;
        case "polygon":
            url = "https://app.overnight.fi/api/dict/strategies";
            break;
        case "optimism":
            url = "https://api.overnight.fi/optimism/usd+/dict/strategies";
            break;
        case "optimism_dai":
            url = "https://api.overnight.fi/optimism/dai+/dict/strategies";
            break;
        case "zksync":
            url = "https://zksync.overnight.fi/api/dict/strategies";
            break;
        case "base":
            url = "https://api.overnight.fi/base/usd+/dict/strategies";
            break;
        case "base_dai":
            url = "https://api.overnight.fi/base/dai+/dict/strategies";
            break;
        case "linea":
            url = "https://api.overnight.fi/linea/usd+/dict/strategies";
            break;
        case "linea_usdt":
            url = "https://api.overnight.fi/linea/usdt+/dict/strategies";
            break;
        case "blast":
            url = "https://api.overnight.fi/blast/usd+/dict/strategies";
            break;
        case "blast_usdc":
            url = "https://api.overnight.fi/blast/usdc+/dict/strategies";
            break;
        default:
            console.error('Unknown STAND: ' + process.env.STAND);
    }

    let strategiesMapping = [];
    try {
        strategiesMapping = (await axios.get(url)).data;
    } catch (e) {
        console.log('Error: ' + e.message);
    }

    return strategiesMapping;
}

async function showM2M(stand = process.env.STAND, blocknumber) {

    let m2m = await getContract('Mark2Market', stand);

    let usdPlus;
    if (stand.includes('_ins')) {
        usdPlus = await getContract('InsuranceToken', stand);
    } else {
        usdPlus = await getContract('UsdPlusToken', stand);
    }
    let pm = await getContract('PortfolioManager', stand);

    let strategyAssets;
    let totalNetAssets;
    let strategyWeights;
    if (blocknumber) {
        strategyAssets = await m2m.strategyAssets({ blockTag: blocknumber });
        totalNetAssets = await m2m.totalNetAssets({ blockTag: blocknumber });
        strategyWeights = await pm.getAllStrategyWeights({ blockTag: blocknumber });
    } else {
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

        if (weight === undefined) {
            continue;
        }

        let mapping = strategiesMapping.find(value => value.address === asset.strategy);

        items.push(
            {
                name: mapping ? mapping.name : asset.strategy,
                netAssetValue: fromAsset(asset.netAssetValue.toString(), stand),
                liquidationValue: fromAsset(asset.liquidationValue.toString(), stand),
                targetWeight: weight.targetWeight.toNumber() / 1000,
                maxWeight: weight.maxWeight.toNumber() / 1000,
                enabled: weight.enabled,
                enabledReward: weight.enabledReward
            });
        sum += parseFloat(fromAsset(asset.netAssetValue.toString(), stand));
    }

    for (let i = 0; i < items.length; i++) {
        items[i].currentWeight = Number((100 * parseFloat(items[i].netAssetValue) / sum).toFixed(3));
    }

    console.table(items);
    console.log('Total m2m:  ' + fromAsset(totalNetAssets.toString(), stand));

    if (usdPlus) {
        let totalUsdPlus = fromUsdPlus(await usdPlus.totalSupply({ blockTag: blocknumber }), stand);
        console.log('Total USD+: ' + totalUsdPlus);
    }

}



async function getPrice() {
    let value = process.env.GAS_PRICE.toString() + "000000000";

    let params = { maxFeePerGas: value, maxPriorityFeePerGas: value };

    if (process.env.ETH_NETWORK === 'POLYGON') {
        params.gasLimit = 15000000;
    } else if (process.env.ETH_NETWORK === 'ARBITRUM') {
        params = { gasLimit: 25000000 }; // gasPrice always 0.1 GWEI
    } else if (process.env.ETH_NETWORK === 'BSC') {
        params = { gasPrice: "3000000000", gasLimit: 15000000 }; // gasPrice always 3 GWEI
    } else if (process.env.ETH_NETWORK === "OPTIMISM") {
        params = { gasPrice: "1000000000", gasLimit: 10000000 }; // gasPrice always 0.001 GWEI
    } else if (process.env.ETH_NETWORK === 'BLAST') {
        params = { gasLimit: 25000000 }; // todo
    } else if (process.env.ETH_NETWORK === 'ZKSYNC') {
        // provider.getGasprice + 15%
        let gasPrice = await ethers.provider.getGasPrice();
        let percentage = gasPrice.mul(BigNumber.from('15')).div(100);
        gasPrice = gasPrice.add(percentage);
        let {
            maxFeePerGas, maxPriorityFeePerGas
        } = await ethers.provider.getFeeData();
        return { maxFeePerGas, maxPriorityFeePerGas, gasLimit: 20000000 }
    } else if (process.env.ETH_NETWORK === 'BASE') {
        let gasPrice = await ethers.provider.getGasPrice();
        let percentage = gasPrice.mul(BigNumber.from('5')).div(100);
        gasPrice = gasPrice.add(percentage);
        return { gasPrice: gasPrice, gasLimit: 20000000 }
    }

    return params;
}


async function impersonateAccount(address) {

    if (isZkSync()) {
        hre.ethers.provider = new hre.ethers.providers.JsonRpcProvider('http://localhost:8011')
    } else {
        hre.ethers.provider = new hre.ethers.providers.JsonRpcProvider('http://localhost:8545')
    }

    await hre.network.provider.request({
        method: "hardhat_impersonateAccount",
        params: [address],
    });

    await transferETH(10, address);

    return await hre.ethers.getSigner(address);
}


async function grantRoleInRoleManager(role, to){

    if (!to){
        to = await getWalletAddress();
    }

    await execTimelock(async (timelock)=>{
        let roleManager = await getContract('RoleManager');
        console.log(`[Scripts] GrantRole: ${role} to ${to} on RoleManager`);
        await roleManager.connect(timelock).grantRole(role, to);
    })
}

async function execTimelock(exec) {


    let timelock = await getContract('AgentTimelock');


    if (hre.network.name === 'localhost') {
        if (isZkSync()) {
            hre.ethers.provider = new hre.ethers.providers.JsonRpcProvider('http://localhost:8011')
        } else {
            hre.ethers.provider = new hre.ethers.providers.JsonRpcProvider('http://localhost:8545')
        }
    }

    await sleep(1000);
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

async function convertWeights(weights) {


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
        value.riskFactor = value.riskFactor * 1000;

        return value;
    })

    return weights;
}

async function changeWeightsAndBalance(weights) {


    await evmCheckpoint('Before');

    let timelock = await getContract('AgentTimelock');
    let pm = await getContract('PortfolioManager');
    let usdPlus = await getContract('UsdPlusToken');
    let usdc = await getERC20('usdc');
    let exchange = await getContract('Exchange');

    console.log('M2M before:')
    await showM2M();

    if (isZkSync()) {
        hre.ethers.provider = new hre.ethers.providers.JsonRpcProvider('http://localhost:8011')
    } else {
        hre.ethers.provider = new hre.ethers.providers.JsonRpcProvider('http://localhost:8545')
    }

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


    if (fromE6(await usdc.balanceOf(wallet.address)) > 10) {
        await usdc.approve(exchange.address, toE6(10));
        await exchange.buy(usdc.address, toE6(10));

        await usdPlus.approve(exchange.address, toE6(10));
        await exchange.redeem(usdc.address, toE6(10));
    }

    console.log('M2M after:')
    await showM2M();

    await evmRestore('Before');

}

async function checkTimeLockBalance() {

    let timelock = await getContract('AgentTimelock');

    const balance = await hre.ethers.provider.getBalance(timelock.address);

    if (new BN(balance.toString()).lt(new BN("10000000000000000000"))) {
        await transferETH(10, timelock.address);
    }

}

async function getChainId() {

    switch (process.env.ETH_NETWORK) {
        case "ARBITRUM":
            return 42161;
        case "BASE":
            return 8453;
        case "BSC":
            return 56;
        case "OPTIMISM":
            return 10;
        case "POLYGON":
            return 137;
        case "ZKSYNC":
            return 324;
        case "LINEA":
            return 59144;
        case "BLAST":
            return 81457;
        default:
            throw new Error("Unknown chain");
    }
}


async function getDevWallet() {

    let provider = ethers.provider;
    return await new ethers.Wallet('0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80', provider);
}


async function transferETH(amount, to) {
    if (isZkSync()) {
        let provider = new Provider("http://localhost:8011");
        let wallet = new Wallet('0x7726827caac94a7f9e1b160f7ea819f172f7b6f9d2a97f992c38edeab82d4110', provider, hre.ethers.provider);
        console.log(`Balance [${fromE18(await provider.getBalance(wallet.address))}]:`);

        await wallet.transfer({
            to: to,
            token: '0x0000000000000000000000000000000000000000',
            amount: ethers.utils.parseEther(amount + ""),
        });
    } else {
        let privateKey = "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80"; // Ganache key
        let walletWithProvider = new ethers.Wallet(privateKey, hre.ethers.provider);

        // вернул как было. у меня не работала почему-то твоя версия
        await walletWithProvider.sendTransaction({
            to: to,
            value: ethers.utils.parseEther(amount + "")
        });
    }

    console.log(`[Node] Transfer ETH [${fromE18(await hre.ethers.provider.getBalance(to))}] to [${to}]`);
}


async function transferUSDPlus(amount, to) {

    let usdPlus = await getContract('UsdPlusToken');

    await execTimelock(async (timelock) => {
        let exchange = await usdPlus.exchange();

        await usdPlus.connect(timelock).setExchanger(timelock.address);
        await usdPlus.connect(timelock).mint(to, toAsset(amount));
        await usdPlus.connect(timelock).setExchanger(exchange);
    });

    console.log('Balance USD+: ' + fromAsset(await usdPlus.balanceOf(to)));
}

async function transferAsset(assetAddress, to, amount) {

    let from;
    switch (process.env.ETH_NETWORK) {
        case "ARBITRUM":
            switch (assetAddress) {
                case ARBITRUM.dai:
                    from = "0x2d070ed1321871841245d8ee5b84bd2712644322";
                    break;
                case ARBITRUM.weth:
                    from = "0x1eed63efba5f81d95bfe37d82c8e736b974f477b";
                    break;
                case ARBITRUM.usdc:
                    from = '0x62383739D68Dd0F844103Db8dFb05a7EdED5BBE6';
                    break;
                case ARBITRUM.usdcCircle:
                    from = '0xe68ee8a12c611fd043fb05d65e1548dc1383f2b9';
                    break;
                case ARBITRUM.usdt:
                    from = '0x8f9c79b9de8b0713dcac3e535fc5a1a92db6ea2d';
                    break;
                case ARBITRUM.wstEth:
                    from = "0x916792f7734089470de27297903bed8a4630b26d";
                    break;
                case ARBITRUM.fraxbp:
                    from = "0x7D94283d7C15B87aeD6a296C3d1c2Fb334509907";
                    break;
                default:
                    throw new Error('Unknown asset address');
            }
            break;
        case "BASE":
            switch (assetAddress) {
                case BASE.usdbc:
                    from = '0x806b9e17306cb97e93bb6c64ee9c9c318e5a0327';
                    break;
                case BASE.usdc:
                    from = '0x20fe51a9229eef2cf8ad9e89d91cab9312cf3b7a';
                    break;
                case BASE.dai:
                    from = '0x428AB2BA90Eba0a4Be7aF34C9Ac451ab061AC010';
                    break;
                case BASE.crvUsd:
                    from = '0x9f1920d0cbb63ed03376a1e09fd2851d601234c8';
                    break;
                default:
                    throw new Error('Unknown asset address');
            }
            break;
        case "BSC":
            switch (assetAddress) {
                case BSC.usdc:
                    from = '0x8894e0a0c962cb723c1976a4421c95949be2d4e3';
                    break;
                case BSC.usdt:
                    from = '0x4b16c5de96eb2117bbe5fd171e4d203624b014aa';
                    break;
                default:
                    throw new Error('Unknown asset address');
            }
            break;
        case "LINEA":
            switch (assetAddress) {
                case LINEA.usdc:
                    from = '0x555ce236c0220695b68341bc48c68d52210cc35b';
                    break;
                case LINEA.usdt:
                    from = '0xd7aa9ba6caac7b0436c91396f22ca5a7f31664fc';
                    break;
                default:
                    throw new Error('Unknown asset address');
            }
            break;
        case "OPTIMISM":
            switch (assetAddress) {
                case OPTIMISM.usdc:
                    from = '0xebe80f029b1c02862b9e8a70a7e5317c06f62cae';
                    break;
                case OPTIMISM.dai:
                    from = '0x7b7b957c284c2c227c980d6e2f804311947b84d0';
                    break;
                case OPTIMISM.usdt:
                    from = '0x0d0707963952f2fba59dd06f2b425ace40b492fe';
                    break;
                case OPTIMISM.wbtc:
                    from = '0xa4cff481cd40e733650ea76f6f8008f067bf6ef3';
                    break;
                case OPTIMISM.ovn:
                    from = '0xe4e83f7083d3f9260285691aaa47e8c57078e311';
                    break;
                default:
                    throw new Error('Unknown asset address');
            }
            break;
        case "POLYGON":
            switch (assetAddress) {
                case POLYGON.usdc:
                    from = '0xe7804c37c13166ff0b37f5ae0bb07a3aebb6e245';
                    break;
                case POLYGON.dai:
                    from = '0xdfD74E3752c187c4BA899756238C76cbEEfa954B';
                    break;
                default:
                    throw new Error('Unknown asset address');
            }
            break;
        case "ZKSYNC": 
            switch (assetAddress) {
                case ZKSYNC.usdc:
                    from = "0x621425a1Ef6abE91058E9712575dcc4258F8d091";
                    break;
                case ZKSYNC.weth:
                    from = "0xE0B015E54d54fc84a6cB9B666099c46adE9335FF";
                    break;
            }
            break;
        case "BLAST":
            switch (assetAddress) {
                case BLAST.usdb:
                    from = '0x15c59df002950e3b7e287de9c0c91aa63e8d9937';
                    break;
                default:
                    throw new Error('Unknown asset address');
            }
            break;
        default:
            throw new Error('Unknown mapping ETH_NETWORK');
    }

    await transferETH(1, from);

    let asset = await getERC20ByAddress(assetAddress);

    if (hre.network.name === 'localhost') {
        if (isZkSync()) {
            hre.ethers.provider = new hre.ethers.providers.JsonRpcProvider('http://localhost:8011')
        } else {
            hre.ethers.provider = new hre.ethers.providers.JsonRpcProvider('http://localhost:8545')
        }
    }

    await hre.network.provider.request({
        method: "hardhat_impersonateAccount",
        params: [from],
    });

    let account = await hre.ethers.getSigner(from);

    if (!amount) {
        amount = await asset.balanceOf(from);
    }
    await asset.connect(account).transfer(to, amount, await getPrice());
    await hre.network.provider.request({
        method: "hardhat_stopImpersonatingAccount",
        params: [from],
    });

    let balance = await asset.balanceOf(to);

    let symbol = await asset.symbol();
    let fromAsset = (await asset.decimals()) === 18 ? fromE18 : fromE6;
    console.log(`[Node] Transfer asset: [${symbol}] balance: [${fromAsset(balance)}] from: [${from}] to: [${to}]`);
}

async function showProfitOnRewardWallet(receipt){

    let usdPlus = await getContract('UsdPlusToken');

    const items = [];

    let balanceBefore = await usdPlus.balanceOf(COMMON.rewardWallet, {blockTag: receipt.blockNumber - 1});
    let balanceAfter = await usdPlus.balanceOf(COMMON.rewardWallet, {blockTag: receipt.blockNumber});

    let profit = balanceAfter.sub(balanceBefore);

    items.push({
        name: 'USD+ before:',
        amount: fromAsset(balanceBefore)
    })

    items.push({
        name: 'USD+ after:',
        amount: fromAsset(balanceAfter)
    })

    items.push({
        name: 'USD+ profit:',
        amount: fromAsset(profit)
    })

    console.table(items);
}

async function showPoolOperationsFromPayout(receipt){


    let stand = process.env.STAND;
    let prefix;

    let chains = ['arbitrum', 'base', 'optimism', 'linea', 'zksync', 'polygon', 'bsc', 'blast'];

    for (const chain of chains) {
        if (stand.includes(chain)){
            prefix = chain.charAt(0).toUpperCase() + chain.slice(1);
        }
    }
    let payoutManager = await getContract(`${prefix}PayoutManager`);

    const rewardsItems = [];
    receipt.logs.forEach((value, index) => {

        try {
            let log = payoutManager.interface.parseLog(value);
            if (log.name === 'PoolOperation') {
                rewardsItems.push({
                    dexName: log.args[0].toString(),
                    operation: log.args[1].toString(),
                    poolName: log.args[2].toString(),
                    pool: log.args[3].toString(),
                    token: log.args[4].toString(),
                    amount: fromAsset(log.args[5].toString()),
                    to: log.args[6].toString(),
                })
            }
        } catch (e) {
        }
    });

    console.table(rewardsItems);
}


async function showPayoutEvent(receipt, exchange){

    if (!exchange){
        exchange = await getContract('Exchange');
    }

    let event = await findEvent(receipt, exchange, 'PayoutEvent');

    if (event){
        console.log('Profit:       ' + fromUsdPlus(await event.args[0].toString()));
        console.log('ExcessProfit: ' + fromUsdPlus(await event.args[2].toString()));
        console.log('Premium:      ' + fromUsdPlus(await event.args[3].toString()));
        console.log('Loss:         ' + fromUsdPlus(await event.args[4].toString()));
    }
}

async function showRewardsFromPayout(receipt) {

    let strategy = await getContract('StrategyEtsEta', 'arbitrum');
    const rewardsItems = [];
    receipt.logs.forEach((value, index) => {

        try {
            let log = strategy.interface.parseLog(value);
            if (log.name === 'Reward') {
                rewardsItems.push({
                    address: value.address,
                    amount: fromAsset(log.args[0].toString())
                })
            }
        } catch (e) {
        }
    });

    console.table(rewardsItems);
}

async function transferDAI(to) {

    let address;
    switch (process.env.ETH_NETWORK) {
        case "OPTIMISM":
            address = '0x7b7b957c284c2c227c980d6e2f804311947b84d0';
            break
        case "POLYGON":
            address = '0xdfD74E3752c187c4BA899756238C76cbEEfa954B';
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

    console.log(`[Node] Transfer DAI [${fromE18(await token.balanceOf(to))}] to [${to}]:`);
}


async function transferWBTC(amount, to) {

    let address;
    switch (process.env.STAND) {
        case "optimism":
            address = '0xa4cff481cd40e733650ea76f6f8008f067bf6ef3';
            break
        default:
            throw new Error(`Unknown holder for chain: [${process.env.STAND}]`);
    }

    await transferETH(1, address);

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


    console.log(`[Node] Transfer WBTC [${fromE8(await wbtc.balanceOf(to))}] to [${to}]:`);

}

async function transferUSDC(amount, to) {


    let address;
    if (process.env.STAND == 'polygon') {
        //work only for Polygon
        // This address has USDC
        address = '0xe7804c37c13166ff0b37f5ae0bb07a3aebb6e245';
    } else if (process.env.STAND == 'optimism') {
        address = '0xd6216fc19db775df9774a6e33526131da7d19a2c';
    } else {
        throw new Error(`Unknown holder for chain: [${process.env.STAND}]`);
    }

    await transferETH(1, address);

    await hre.network.provider.request({
        method: "hardhat_impersonateAccount",
        params: [address],
    });


    const account = await hre.ethers.getSigner(address);

    let usdc = await getERC20('usdc');

    await usdc.connect(account).transfer(to, await usdc.balanceOf(account.address));

    await hre.network.provider.request({
        method: "hardhat_stopImpersonatingAccount",
        params: [account.address],
    });

    console.log(`[Node] Transfer USDC [${fromE6(await usdc.balanceOf(to))}] to [${to}]:`);
}

function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

module.exports = {
    getStrategyMapping: getStrategyMapping,
    getChainId: getChainId,
    convertWeights: convertWeights,
    addStrategyToApi: addStrategyToApi,
    initWallet: initWallet,
    getWalletAddress: getWalletAddress,
    getDevWallet: getDevWallet,
    transferETH: transferETH,
    sleep: sleep,
    transferDAI: transferDAI,
    transferUSDPlus: transferUSDPlus,
    transferWBTC: transferWBTC,
    transferUSDC: transferUSDC,
    transferAsset: transferAsset,
    showM2M: showM2M,
    getPrice: getPrice,
    getContract: getContract,
    findEvent: findEvent,
    getContractByAddress: getContractByAddress,
    getBytecode: getBytecode,
    isContract: isContract,
    getImplementation: getImplementation,
    getERC20: getERC20,
    getERC20ByAddress: getERC20ByAddress,
    getCoreAsset: getCoreAsset,
    getStrategy: getStrategy,
    changeWeightsAndBalance: changeWeightsAndBalance,
    execTimelock: execTimelock,
    getAbi: getAbi,
    deploySection: deploySection,
    settingSection: settingSection,
    checkTimeLockBalance: checkTimeLockBalance,
    impersonateAccount: impersonateAccount,
    showRewardsFromPayout: showRewardsFromPayout,
    showPoolOperationsFromPayout: showPoolOperationsFromPayout,
    showPayoutEvent: showPayoutEvent,
    showProfitOnRewardWallet: showProfitOnRewardWallet,
    grantRoleInRoleManager: grantRoleInRoleManager,
}
