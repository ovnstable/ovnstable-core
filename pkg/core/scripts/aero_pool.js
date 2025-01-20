const { getContract, initWallet, getERC20ByAddress, transferETH, transferAsset } = require("@overnight-contracts/common/utils/script-utils");
const { BASE } = require("@overnight-contracts/common/utils/assets");
const hre = require("hardhat");
const { engineSendTxSigned } = require("@overnight-contracts/common/utils/engine");
const { BigNumber } = require("ethers");

let poolAddress = "0x8dd9751961621Fcfc394d90969E5ae0c5BAbE147";
let pauseTime = 15;

async function main() {
    let iterations = 20;
    let isLeverageIncrease = false;

    const provider = new ethers.providers.JsonRpcProvider(
        "http://localhost:8545"
    );

    await provider.send("hardhat_impersonateAccount", ["0x086dFe298907DFf27BD593BD85208D57e0155c94"]);
    const dev5 = provider.getSigner("0x086dFe298907DFf27BD593BD85208D57e0155c94");
    const dev5Address = await dev5.getAddress();
    
    await logCommon(await hre.ethers.provider.getBlockNumber(), "| (start)");

    let wallet = await initWallet();
    
    let swapper = await getContract('AeroSwap', 'base_usdc');
    let exchange = await getContract('Exchange', 'base_usdc');
    let usdp = await getERC20ByAddress(BASE.usdcPlus, dev5Address);
    let usdc = await getERC20ByAddress(BASE.usdc, dev5Address);
    let pool = await hre.ethers.getContractAt("@overnight-contracts/connectors/contracts/stuff/Aerodrome.sol:ICLPool", poolAddress);

    let pm = await getContract('PortfolioManager', 'base_usdc');

    let sAsset = isLeverageIncrease ? usdc : usdp; // Токен, в котором изначально должна лежать сумма, которую мы прокручиваем
    let dAsset = isLeverageIncrease ? usdp : usdc;

   
    let gas = {
        gasLimit: 30000000, 
        maxFeePerGas: "38000000",
        maxPriorityFeePerGas: "1300000",
    }
    
    let swapStrategyInitAmount = 0;
    let cashStrategyInitAmount = 0;


    let cashInitWeight = await getCashWeight(pm);
    console.log("CASH-strategy initial weight: ", cashInitWeight);
        

    for (let i = 0; i < iterations; i++) {
        console.log("-----iteration ", i, "-----");
        await logCommon(await hre.ethers.provider.getBlockNumber(), "| (before all)");


        // Approve asset to burn USDCP:
        let sBalance = await sAsset.balanceOf(dev5Address); 
        await new Promise(resolve => setTimeout(resolve, pauseTime));
        let bn = (await (await sAsset.connect(dev5).approve(exchange.address, sBalance, gas)).wait()).blockNumber;

        // Calculate inital amounts of assets in SWAP- and CASH- strategies so that calculate the correct weight change later:
        if (i == 0) {
            let token0PoolAmount = await usdc.balanceOf(poolAddress, {blockTag: bn});
            let token1PoolAmount = await usdp.balanceOf(poolAddress, {blockTag: bn});
            let token0PoolAmountFormatted = (Number(token0PoolAmount) / 1e6)
            let token1PoolAmountFormatted = (Number(token1PoolAmount) / 1e6)

            swapStrategyInitAmount = token0PoolAmountFormatted + token1PoolAmountFormatted;


            let m2m = await getContract('Mark2Market', 'base_usdc');
            let assets = await m2m.strategyAssets({blockTag: bn});
            let cashNav = assets[0].netAssetValue; 
            let cashStrategyInitAmountFormatted = (Number(cashNav) / 1e6);

            cashStrategyInitAmount = cashStrategyInitAmountFormatted;
        }


        await new Promise(resolve => setTimeout(resolve, pauseTime));
        if (isLeverageIncrease) {
            // Mint USDCP: 
            bn = (await (await exchange.connect(dev5).buy(usdc.address, sBalance, gas)).wait()).blockNumber;
        } else {
            // Burn USDCP
            bn = (await (await exchange.connect(dev5).redeem(usdc.address, sBalance, gas)).wait()).blockNumber;
        }
        await logCommon(bn, "| (after exchange)");
        

        // Swap USDC to USDCP:
        let dBalance = await dAsset.balanceOf(dev5Address);
        console.log("DEBUG: dBalance =", dBalance)
        // dBalance = 10000000000;
        
        await new Promise(resolve => setTimeout(resolve, pauseTime));
        bn = (await (await dAsset.connect(dev5).approve(swapper.address, dBalance, gas)).wait()).blockNumber;
        await new Promise(resolve => setTimeout(resolve, pauseTime));
        bn = (await (await swapper.connect(dev5).swap(poolAddress, dBalance, 0n, !isLeverageIncrease, gas)).wait()).blockNumber;                                                  
        await logCommon(bn, "| (after swap)");

    
        // Calculate weight change:
        let N = Math.trunc(sBalance.toString() / 1e6);

        let cashTargetShare = 0;
        if (isLeverageIncrease) {
            cashTargetShare = (cashStrategyInitAmount / (swapStrategyInitAmount + i * N + cashStrategyInitAmount));
        } else {
            cashTargetShare = (cashStrategyInitAmount / (swapStrategyInitAmount - i * N + cashStrategyInitAmount));
        }

        let cashTargetWeight = cashTargetShare * 100000;

        console.log("cashTargetShare:     ", cashTargetShare);
        console.log("cashTargetWeight:    ", cashTargetWeight);

        await new Promise(resolve => setTimeout(resolve, pauseTime));

        let cashWeight = await getCashWeight(pm);
        console.log("CASH-strategy current weight: ", cashWeight);
        
        let cashDiff = cashTargetWeight - cashWeight;
        console.log("cashDiff:            ", cashDiff);

        // If weight difference is greater than minimum possible change value
        if ((isLeverageIncrease && cashDiff <= -1) || (!isLeverageIncrease && cashDiff >= 1)) {
            console.log("Weight change is more than 1")
            let roundedCashDiff = Math.trunc(cashDiff)
            await decrementWeight(roundedCashDiff, pm, dev5);
            
            let cashNewWeight = await getCashWeight(pm);
            console.log("CASH-strategy new weight: ", cashNewWeight);
        }

        bn = (await (await pm.connect(dev5).balance(gas)).wait()).blockNumber;

        await new Promise(resolve => setTimeout(resolve, pauseTime));
        await logCommon(bn, "| (after balance)");
    }

    let sAssetBalance = await sAsset.balanceOf(dev5Address);
    console.log("USDC balance at the end: " + sAssetBalance.toString());
}

async function getCashWeight(pm) {
    let strategyWeightsJSON = await pm.getAllStrategyWeights();
    let strategyWeights = JSON.parse(JSON.stringify(strategyWeightsJSON));
    let cashWeight = parseInt(strategyWeights[0][2].hex, 16)
    return cashWeight
}

async function decrementWeight(diff, pm, dev5) {
    let strategyWeights = await pm.getAllStrategyWeights();
    let newWeights = JSON.parse(JSON.stringify(strategyWeights));
    newWeights[0][2] = BigNumber.from(newWeights[0][2]).add(diff);
    newWeights[1][2] = BigNumber.from(newWeights[1][2]).sub(diff); 
    await (await pm.connect(dev5).setStrategyWeights(newWeights)).wait();
}


async function logCommon(bn, text) {
    let wallet = await initWallet();

    let usdp = await getERC20ByAddress(BASE.usdcPlus, "0x086dFe298907DFf27BD593BD85208D57e0155c94");
    let usdc = await getERC20ByAddress(BASE.usdc, "0x086dFe298907DFf27BD593BD85208D57e0155c94");
    let m2m = await getContract('Mark2Market', 'base_usdc');

    let assets = await m2m.strategyAssets({blockTag: bn});
    let totalNetAssets = await m2m.totalNetAssets({blockTag: bn});
    let cashNav = assets[0].netAssetValue; 

    let usdPlusPoolBalance = await usdp.balanceOf(poolAddress, {blockTag: bn});
    let usdcPoolBalance = await usdc.balanceOf(poolAddress, {blockTag: bn});

    console.log("bn=", bn,
        "usdp=",(Number(usdPlusPoolBalance) / 1e6).toFixed(0),
        "usdc=",(Number(usdcPoolBalance) / 1e6).toFixed(0),
        "cash=",(Number(cashNav) / 1e6).toFixed(0),
        "nav=",(Number(totalNetAssets) / 1e6).toFixed(0),
        text
    );
}


main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });