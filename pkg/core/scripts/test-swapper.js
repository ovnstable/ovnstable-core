const hre = require("hardhat");
const ethers = hre.ethers;
const {getContract, getPrice, execTimelock, showM2M, changeWeightsAndBalance, initWallet} = require("@overnight-contracts/common/utils/script-utils");
const {POLYGON} = require("@overnight-contracts/common/utils/assets");
const {toE6} = require("@overnight-contracts/common/utils/decimals");
const {evmCheckpoint, evmRestore} = require("@overnight-contracts/common/utils/sharedBeforeEach");
const {core} = require("@overnight-contracts/common/utils/core");


async function main() {

    await evmCheckpoint('Before');

    let wallet = await initWallet(hre.ethers);

    let sum = 500000;

    let report = { }

    try {
        await execTimelock(async (timelock) => {
            await showM2M();

            await setWeights(timelock);
            await showM2M();
            let value = "10000000000000000000000000"; // 10kk matics

            // const buyonSwap = await ethers.getContract("BuyonSwap");
            const buyonSwap = await getContract("BuyonSwap");
            let usdc = await ethers.getContractAt("IERC20", POLYGON.usdc);


            await (await buyonSwap.buy(POLYGON.usdc, POLYGON.quickSwapRouter, {value: value})).wait();
            console.log('bbbb');
            await upgradeTo(timelock);

            let exchange = await getContract('Exchange');
            await usdc.approve(exchange.address, toE6(sum));
            console.log('bbbb2');


            let tx = await exchange.buy(POLYGON.usdc, toE6(sum));
            report.buyGasLimit = tx.gasLimit.toString();

            await showM2M();


            let usdPlus = await getContract('UsdPlusToken');
            let balance = await usdPlus.balanceOf(wallet.address)
            console.log(`balance: ${balance.toString()}`);
            await usdPlus.approve(exchange.address, balance.toString());
            console.log('bbbb3');
            tx = await exchange.redeem(POLYGON.usdc, balance.toString());
            console.log('bbbb4');
            report.redeemGasLimit = tx.gasLimit.toString();


            await showM2M();
        });

        console.log('');
        console.log('Buy/Redeem  sum: ' + sum);
        console.log('Buy    gasLimit: ' + report.buyGasLimit.toString());
        console.log('Redeem gasLimit: ' + report.redeemGasLimit.toString());
    } catch (e) {
        console.log(e);
    }


    await evmRestore('Before');

}


async function setWeights(timelock){


    let weights = [
        {
            "strategy": "0x5e0d74aCeC01b8cb9623658Fc356304fEB01Aa96",
            "name": "Aave",
            "minWeight": 0,
            "targetWeight": 2.5,
            "maxWeight": 3,
            "enabled": true,
            "enabledReward": true
        },
        {
            "strategy": "0xc1Ab7F3C4a0c9b0A1cebEf532953042bfB9ebED5",
            "name": "Tetu USDC",
            "minWeight": 0,
            "targetWeight": 0.5,
            "maxWeight": 100,
            "enabled": true,
            "enabledReward": true
        },

        {
            "strategy": "0x69554b32c001Fd161aa48Bae6fD8785767087672",
            "name": "Dodo USDC",
            "minWeight": 0,
            "targetWeight": 27,
            "maxWeight": 100,
            "enabled": true,
            "enabledReward": true
        },
        {
            "strategy": "0x6343F143708Cc3d2130f94a4dd90fC4cD9440393",
            "name": "Dystopia USDC/USDT",
            "minWeight": 0,
            "targetWeight": 5,
            "maxWeight": 100,
            "enabled": true,
            "enabledReward": true
        },
        {
            "strategy": "0xb1c1e7190100272cF6109aF722C3c1cfD9259c7a",
            "name": "Dystopia USDC/DAI",
            "minWeight": 0,
            "targetWeight": 5,
            "maxWeight": 100,
            "enabled": true,
            "enabledReward": true
        },
        {
            "strategy": "0xde7d6Ee773A8a44C7a6779B40103e50Cd847EFff",
            "name": "Synapse USDC",
            "minWeight": 0,
            "targetWeight": 60,
            "maxWeight": 100,
            "enabled": true,
            "enabledReward": true
        },

    ]



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


    let pm = await getContract('PortfolioManager' );
    await (await pm.connect(timelock).setStrategyWeights(weights)).wait();
    console.log('setStrategyWeights done()');
}

async function upgradeTo(timelock){

    let dystUsdcUsdt = await getContract('StrategyDystopiaUsdcUsdt' );
    let dystUsdcDai = await getContract('StrategyDystopiaUsdcDai' );

    await (await dystUsdcUsdt.connect(timelock).upgradeTo('0xe7b9B24f09cb9039F13a4660f29453549702Bca6')).wait();
    console.log(`dystUsdcUsdt upgradeTo 0xe7b9B24f09cb9039F13a4660f29453549702Bca6`)

    await (await dystUsdcDai.connect(timelock).upgradeTo('0xF586C5047967DA9f62A8A308119F0811d4b356Be')).wait();
    console.log(`dystUsdcDai upgradeTo 0xF586C5047967DA9f62A8A308119F0811d4b356Be`)

    let dystToken = '0x39aB6574c289c3Ae4d88500eEc792AB5B947A5Eb';
    let dystPair = '0x4570da74232c1A784E77c2a260F85cdDA8e7d47B'; //sAMM-USDC/USDT
    let dystRouter = '0xbE75Dd16D029c6B32B7aD57A0FD9C1c20Dd2862e'; //DystRouter01
    let gauge = '0x7c9716266795a04ae1fbbd017dc2585fbf78076d'; //aka MasterChef
    let penToken = '0x9008D70A5282a936552593f410AbcBcE2F891A97';
    let userProxy = '0xc9Ae7Dac956f82074437C6D40f67D6a5ABf3E34b';
    let penLens = '0x1432c3553FDf7FBD593a84B3A4d380c643cbf7a2';
    let swapper = '0x019D17272687904F855D235dbBA7fD9268088Ea5';

    await (await dystUsdcUsdt.connect(timelock).setTokens(POLYGON.usdc, POLYGON.usdt, dystToken, POLYGON.wMatic, penToken)).wait();
    console.log(`setTokens done for ${dystUsdcUsdt.address}`)

    await (await dystUsdcUsdt.connect(timelock).setParams(
        gauge,
        dystPair,
        dystRouter,
        POLYGON.balancerVault,
        POLYGON.balancerPoolIdUsdcTusdDaiUsdt,
        POLYGON.oracleChainlinkUsdc,
        POLYGON.oracleChainlinkUsdt,
        userProxy,
        penLens,
        swapper
    )).wait();
    console.log(`setParams done for ${dystUsdcUsdt.address}`)

    await (await dystUsdcUsdt.connect(timelock).setPortfolioManager(core.pm)).wait();

    console.log('StrategyDystopiaUsdcUsdt setting done');



    dystToken = '0x39aB6574c289c3Ae4d88500eEc792AB5B947A5Eb';
    dystPair = '0xFec23508fE4b5d10A3eb0D83b9947CAa56F39463'; //sAMM-USDC/DAI
    dystRouter = '0xbE75Dd16D029c6B32B7aD57A0FD9C1c20Dd2862e'; //DystRouter01
    gauge = '0x9c3Afbc9D0540168C6D4f3dA0F48FeBA6a3A7d2a'; //aka MasterChef
    penToken = '0x9008D70A5282a936552593f410AbcBcE2F891A97';
    userProxy = '0xc9Ae7Dac956f82074437C6D40f67D6a5ABf3E34b';
    penLens = '0x1432c3553FDf7FBD593a84B3A4d380c643cbf7a2';
    swapper = '0x019D17272687904F855D235dbBA7fD9268088Ea5';


    await (await dystUsdcDai.connect(timelock).setTokens(POLYGON.usdc, POLYGON.dai, dystToken, POLYGON.wMatic, penToken)).wait();
    console.log(`setTokens done for ${dystUsdcDai.address}`)

    await (await dystUsdcDai.connect(timelock).setParams(
        gauge,
        dystPair,
        dystRouter,
        POLYGON.balancerVault,
        POLYGON.balancerPoolIdUsdcTusdDaiUsdt,
        POLYGON.oracleChainlinkUsdc,
        POLYGON.oracleChainlinkDai,
        userProxy,
        penLens,
        swapper
    )).wait();
    console.log(`setParams done for ${dystUsdcDai.address}`)

    await (await dystUsdcDai.connect(timelock).setPortfolioManager(core.pm)).wait();

    console.log('StrategyDystopiaUsdcDai setting done');

}


main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });

