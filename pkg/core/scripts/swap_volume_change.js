const { getContract, initWallet, getERC20ByAddress, transferETH, transferAsset } = require("@overnight-contracts/common/utils/script-utils");
const { BASE, BLAST } = require("@overnight-contracts/common/utils/assets");
const hre = require("hardhat");
const { BigNumber } = require("ethers");


const strategiesInfo = {
    "Aerodrome": {
        poolAddress: "0x8dd9751961621Fcfc394d90969E5ae0c5BAbE147",
        swapperName: "AeroSwap",
        exchangeName: "Exchange",
        ourTokenAddress: BASE.usdcPlus,
        anotherTokenAddress: BASE.usdc,
        stand: "base_usdc",
        cashStrategyPMIndex: 0,
        swapStrategyPMIndex: 1
    },
    "Fenix": {
        poolAddress: "0x6a1de1841c5c3712e3bc7c75ce3d57dedec6915f",
        swapperName: "FenixSwap",
        exchangeName: "Exchange",
        ourTokenAddress: "0x4fee793d435c6d2c10c135983bb9d6d4fc7b9bbd",
        anotherTokenAddress: "0x4300000000000000000000000000000000000003",
        stand: "blast",
        cashStrategyPMIndex: 0,
        swapStrategyPMIndex: 2
    },
    "Thruster": {
        poolAddress: "0x147e7416d5988b097b3a1859efecc2c5e04fdf96",
        swapperName: "ThrusterSwap",
        exchangeName: "Exchange",
        ourTokenAddress: BLAST.usdPlus,
        anotherTokenAddress: BLAST.usdb,
        stand: "blast",
        cashStrategyPMIndex: 0,
        swapStrategyPMIndex: 1
    }
}

let poolAddress, swapperName, exchangeName, ourTokenAddress, anotherTokenAddress, stand, cashStrategyPMIndex, swapStrategyPMIndex;

async function initializeStrategyConfig(strategy) {
    ({
        poolAddress, 
        swapperName, 
        exchangeName, 
        ourTokenAddress, 
        anotherTokenAddress, 
        stand, 
        cashStrategyPMIndex, 
        swapStrategyPMIndex 
    } = strategiesInfo[strategy]);
}

async function main() {

    let pauseTime = 15;
    let strategy = "Thruster";
    let iterations = 10;
    let isLeverageIncrease = true;

    await initializeStrategyConfig(strategy);

    let wallet = await initWallet();

    // --->
    const provider = new ethers.providers.JsonRpcProvider(
        "http://localhost:8545"
    );
    await provider.send("hardhat_impersonateAccount", ["0x086dFe298907DFf27BD593BD85208D57e0155c94"]);
    const dev5 = provider.getSigner("0x086dFe298907DFf27BD593BD85208D57e0155c94");
    const dev5Address = "0x086dFe298907DFf27BD593BD85208D57e0155c94";
    // <---
    
    await logCommon(await hre.ethers.provider.getBlockNumber(), "| (start)");
    
    let swapper = await getContract(swapperName, stand); 
    let exchange = await getContract(exchangeName, stand);  
    let anotherToken = await getERC20ByAddress(anotherTokenAddress, dev5Address); 
    let ourToken = await getERC20ByAddress(ourTokenAddress, dev5Address); 
    
    let pm = await getContract('PortfolioManager', stand); 

    await testEnabling(pm, dev5); // for Thruster only now

    let sAsset = isLeverageIncrease ? anotherToken : ourToken;
    let dAsset = isLeverageIncrease ? ourToken : anotherToken;

    let strategyWeightsJSON = await pm.getAllStrategyWeights();
    let strategyWeights = JSON.parse(JSON.stringify(strategyWeightsJSON));
    let cashWeight = parseInt(strategyWeights[cashStrategyPMIndex][2].hex, 16)
    let swapWeight = parseInt(strategyWeights[swapStrategyPMIndex][2].hex, 16)

    let availableShare = (swapWeight + cashWeight) / 100000; // какую долю портфеля составляют доли свап- и кэш- стратегий вместе (если только они - то 1)
   
    let gas = {
        gasLimit: 30000000, 
        maxFeePerGas: "38000000",
        maxPriorityFeePerGas: "1300000",
    }

    let cashInitWeight = await getCashWeight(pm);
    console.log("CASH-strategy initial weight: ", cashInitWeight);

    // Calculate inital amounts of assets in SWAP- and CASH- strategies so that calculate the correct weight change later:
    
    let anotherTokenAmount = await anotherToken.balanceOf(poolAddress);
    let ourTokenAmount = await ourToken.balanceOf(poolAddress);
    let anotherTokenAmountFormatted = (Number(anotherTokenAmount))
    let ourTokenAmountFormatted = (Number(ourTokenAmount))

    let swapStrategyInitAmount = anotherTokenAmountFormatted + ourTokenAmountFormatted;

    let m2m = await getContract('Mark2Market', stand); 
    let assets = await m2m.strategyAssets();
    let cashNav = assets[cashStrategyPMIndex].netAssetValue; 
    let cashStrategyInitAmount = (Number(cashNav));   
    
    let bn0 = await sAsset.connect(dev5).transfer("0x8df424e487De4218B347e1798efA11A078fecE90", 20000000000000000000000n) // for Thruster testing only
 
    for (let i = 0; i < iterations; i++) {
        console.log("-----iteration ", i, "-----");
        await logCommon(await hre.ethers.provider.getBlockNumber(), "| (before all)");

        // Approve asset to burn USDCP:
        let sBalance = await sAsset.balanceOf(dev5Address); 
        await new Promise(resolve => setTimeout(resolve, pauseTime));


        let bn = (await (await sAsset.connect(dev5).approve(exchange.address, sBalance, gas)).wait()).blockNumber;

        let dBalanceBefore = await dAsset.balanceOf(dev5Address);
        console.log("dBalanceBefore: ", dBalanceBefore)

        await new Promise(resolve => setTimeout(resolve, pauseTime));
        if (isLeverageIncrease) {
            // Mint USDCP: 
            bn = (await (await exchange.connect(dev5).buy(anotherToken.address, sBalance, gas)).wait()).blockNumber;
        } else {
            // Burn USDCP
            bn = (await (await exchange.connect(dev5).redeem(anotherToken.address, sBalance, gas)).wait()).blockNumber;
        }
        await logCommon(bn, "| (after exchange)");

        let dBalanceAfter = await dAsset.balanceOf(dev5Address);
        console.log("dBalanceAfter:            ", dBalanceAfter)

        let dAssetAmountToSwap = dBalanceAfter - dBalanceBefore;
        console.log("dAssetAmountToSwap:       ", dAssetAmountToSwap)


        await new Promise(resolve => setTimeout(resolve, pauseTime));
        bn = (await (await dAsset.connect(dev5).approve(swapper.address, BigInt(dAssetAmountToSwap), gas)).wait()).blockNumber; // BigInt(dAssetAmountToSwap)
        await new Promise(resolve => setTimeout(resolve, pauseTime));
        bn = (await (await swapper.connect(dev5).swap(poolAddress, BigInt(dAssetAmountToSwap), 0n, !isLeverageIncrease, gas)).wait()).blockNumber;                                        
        await logCommon(bn, "| (after swap)");

    
        // Calculate weight change:
        let N = dAssetAmountToSwap;
        let cashTargetRelativeShare = 0;

        if (isLeverageIncrease) {
            cashTargetRelativeShare = (cashStrategyInitAmount / (swapStrategyInitAmount + i * N + cashStrategyInitAmount));
        } else {
            cashTargetRelativeShare = (cashStrategyInitAmount / (swapStrategyInitAmount - i * N + cashStrategyInitAmount));
        }

        let cashTargetRelativeWeight = cashTargetRelativeShare * 100000;
        let cashTargetWeight = cashTargetRelativeWeight * availableShare;

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
    let cashWeight = parseInt(strategyWeights[cashStrategyPMIndex][2].hex, 16) 
    return cashWeight
}

async function decrementWeight(diff, pm, dev5) {
    let strategyWeights = await pm.getAllStrategyWeights();
    let newWeights = JSON.parse(JSON.stringify(strategyWeights));
    newWeights[cashStrategyPMIndex][2] = BigNumber.from(newWeights[cashStrategyPMIndex][2]).add(diff); 
    newWeights[swapStrategyPMIndex][2] = BigNumber.from(newWeights[swapStrategyPMIndex][2]).sub(diff);  
    await (await pm.connect(dev5).setStrategyWeights(newWeights)).wait();
}

async function testEnabling(pm, dev5) {
    let strategyWeights = await pm.getAllStrategyWeights();
    let newWeights = JSON.parse(JSON.stringify(strategyWeights));

    newWeights[1][5] = true;
    newWeights[2][5] = false;

    await (await pm.connect(dev5).setStrategyWeights(newWeights)).wait();
}

async function logCommon(bn, text) {
    // let wallet = await initWallet();
    // walletAddress = wallet.address;
    walletAddress = "0x086dFe298907DFf27BD593BD85208D57e0155c94"; // dev5

    let ourToken = await getERC20ByAddress(ourTokenAddress, walletAddress); 
    let anotherToken = await getERC20ByAddress(anotherTokenAddress, walletAddress);
    let m2m = await getContract('Mark2Market', stand); 

    let assets = await m2m.strategyAssets({blockTag: bn});
    let totalNetAssets = await m2m.totalNetAssets({blockTag: bn});
    let cashNav = assets[cashStrategyPMIndex].netAssetValue; 

    let ourTokenPoolBalance = await ourToken.balanceOf(poolAddress, {blockTag: bn});
    let anotherTokenPoolBalance = await anotherToken.balanceOf(poolAddress, {blockTag: bn});

    console.log("bn=", bn,
        "usdp=",(Number(ourTokenPoolBalance) / 1e18).toFixed(0),
        "usdc=",(Number(anotherTokenPoolBalance) / 1e18).toFixed(0), 
        "cash=",(Number(cashNav) / 1e18).toFixed(0),
        "nav=",(Number(totalNetAssets) / 1e18).toFixed(0), 
        text
    );
}


main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });