const hre = require("hardhat");
const ethers = hre.ethers;
const {getContract, getPrice, execTimelock, showM2M, changeWeightsAndBalance, initWallet} = require("@overnight-contracts/common/utils/script-utils");
const {POLYGON} = require("@overnight-contracts/common/utils/assets");
const {toUSDC} = require("@overnight-contracts/common/utils/decimals");
const {evmCheckpoint, evmRestore} = require("@overnight-contracts/common/utils/sharedBeforeEach");


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

            // await upgradeTo(timelock);
            //
            // let exchange = await getContract('Exchange');
            //
            // let tx = await exchange.buy(POLYGON.usdc, toUSDC(sum));
            // report.buyGasLimit = tx.gasLimit.toString();
            //
            // await showM2M();
            //
            //
            // let usdPlus = await getContract('UsdPlusToken');
            // await usdPlus.approve(exchange.address, await usdPlus.balanceOf(wallet.address));
            // tx = await exchange.redeem(POLYGON.usdc, await usdPlus.balanceOf(wallet.address));
            // report.redeemGasLimit = tx.gasLimit.toString();
            //
            //
            // await showM2M();
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
            "targetWeight": 22.5,
            "maxWeight": 100,
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
            "strategy": "0x6343F143708Cc3d2130f94a4dd90fC4cD9440393",
            "name": "Dystopia USDC/USDT",
            "minWeight": 0,
            "targetWeight": 35.3,
            "maxWeight": 100,
            "enabled": true,
            "enabledReward": true
        },
        {
            "strategy": "0x69554b32c001Fd161aa48Bae6fD8785767087672",
            "name": "Dodo USDC",
            "minWeight": 0,
            "targetWeight": 0,
            "maxWeight": 100,
            "enabled": true,
            "enabledReward": true
        },

        {
            "strategy": "0xb1c1e7190100272cF6109aF722C3c1cfD9259c7a",
            "name": "Dystopia USDC/DAI",
            "minWeight": 0,
            "targetWeight": 41.7,
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

    await (await dystUsdcUsdt.connect(timelock).upgradeTo('0x3d65d57fB9bD9d16e7499Ba8eE97e4eDb942ba7e')).wait();
    await (await dystUsdcDai.connect(timelock).upgradeTo('0x3A7A4da35Ff5b6571dfa6a3e6E5e4637cC3a7413')).wait();



    let dystPair = '0x4570da74232c1A784E77c2a260F85cdDA8e7d47B'; //sAMM-USDC/USDT
    let dystRouter = '0xbE75Dd16D029c6B32B7aD57A0FD9C1c20Dd2862e'; //DystRouter01
    let gauge = '0x7c9716266795a04ae1fbbd017dc2585fbf78076d'; //aka MasterChef
    let userProxy = '0xc9Ae7Dac956f82074437C6D40f67D6a5ABf3E34b';
    let penLens = '0x1432c3553FDf7FBD593a84B3A4d380c643cbf7a2';
    let swapper = '0xf69f73Cac304A0433Ba414819E3e024Fd1Ce4fC8';

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



    dystPair = '0xFec23508fE4b5d10A3eb0D83b9947CAa56F39463'; //sAMM-USDC/DAI
    dystRouter = '0xbE75Dd16D029c6B32B7aD57A0FD9C1c20Dd2862e'; //DystRouter01
    gauge = '0x9c3Afbc9D0540168C6D4f3dA0F48FeBA6a3A7d2a'; //aka MasterChef
    userProxy = '0xc9Ae7Dac956f82074437C6D40f67D6a5ABf3E34b';
    penLens = '0x1432c3553FDf7FBD593a84B3A4d380c643cbf7a2';
    swapper = '0xf69f73Cac304A0433Ba414819E3e024Fd1Ce4fC8';


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
}


main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });

