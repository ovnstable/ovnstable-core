const { getContract, initWallet, getERC20ByAddress, transferETH, transferAsset } = require("@overnight-contracts/common/utils/script-utils");
const { BASE } = require("@overnight-contracts/common/utils/assets");
const hre = require("hardhat");
const { engineSendTxSigned } = require("@overnight-contracts/common/utils/engine");
const { BigNumber } = require("ethers");

let poolAddress = "0x8dd9751961621Fcfc394d90969E5ae0c5BAbE147";

async function main() {

    // await decrementWeight(1);

    let pauseTime = 15;

    const provider = new ethers.providers.JsonRpcProvider(
        "http://localhost:8545"
    );

    // ПАУЗА: похоже, что в этом случае нужно сначала свапнуть + на USDC, и уже на них минтить 

    await provider.send("hardhat_impersonateAccount", ["0x086dFe298907DFf27BD593BD85208D57e0155c94"]);
    const dev5 = provider.getSigner("0x086dFe298907DFf27BD593BD85208D57e0155c94");
    
    const dev5Address = await dev5.getAddress();
    // await transferETH(1, dev5Address);
    
    await logCommon(await hre.ethers.provider.getBlockNumber(), "| (start)");

    let iterations = 10;
    let isLeverageIncrease = true; // !!!!!

    let wallet = await initWallet();
    
    
    let swapper = await getContract('AeroSwap', 'base_usdc');
    let exchange = await getContract('Exchange', 'base_usdc');
    let usdp = await getERC20ByAddress(BASE.usdcPlus, dev5Address);
    let usdc = await getERC20ByAddress(BASE.usdc, dev5Address);
    let pool = await hre.ethers.getContractAt("@overnight-contracts/connectors/contracts/stuff/Aerodrome.sol:ICLPool", poolAddress);

    await transferAsset(BASE.usdc, dev5Address, 100000000000);

    let pm = await getContract('PortfolioManager', 'base_usdc');

    let sAsset = isLeverageIncrease ? usdc : usdp; // USDC
    let dAsset = isLeverageIncrease ? usdp : usdc; // USDP

   
    let gas = {
        gasLimit: 30000000, // было 35000000
        maxFeePerGas: "38000000",
        maxPriorityFeePerGas: "1300000",
    }
    
    let swapStrategyAmountStart = 0;
    let cashStrategyAmountStart = 0;

    // console.log("Первичная балансировка...")
    // bn = (await (await pm.connect(dev5).balance(gas)).wait()).blockNumber;
    // console.log("Первичная балансировка проведена!")

    let strategyWeights = await pm.getAllStrategyWeights();
    let newWeights = JSON.parse(JSON.stringify(strategyWeights));

    let cashStartWeight = parseInt(newWeights[0][2].hex, 16)
    console.log("Начальный вес CASH-стратегии = ", cashStartWeight)

    // сначала просто немного сдвинем цену влево:

    await logCommon(await hre.ethers.provider.getBlockNumber(), "| (before initial swap)");
    await transferAsset(BASE.usdc, dev5Address, 100000000000);
    bn = (await (await sAsset.connect(dev5).approve(swapper.address, 100000000000, gas)).wait()).blockNumber;
    bn = (await (await swapper.connect(dev5).swap(poolAddress, 100000000000, 0n, true, gas)).wait()).blockNumber;
    await logCommon(await hre.ethers.provider.getBlockNumber(), "| (after initial swap)");

        

    // СЧИТАЕМ, ЧТО ДЛЯ РАБОТЫ ЭТОГО СКРИПТА НУЖНО ЧТОБЫ ИЗНАЧАЛЬНО НА БАЛАНСЕ БЫЛИ USDC

    for (let i = 0; i < iterations; i++) {
        console.log("-----iteration ", i, "-----");
        await logCommon(await hre.ethers.provider.getBlockNumber(), "| (before all)");

        let sBalance = await sAsset.balanceOf(dev5Address); 
        let dBalance2 = await dAsset.balanceOf(dev5Address); 
        // let sBalance = 10000;

        console.log("DEBUG: USDC  balance: = ", sBalance);
        console.log("DEBUG: USDCP balance: = ", dBalance2);

        // return;
        await new Promise(resolve => setTimeout(resolve, pauseTime));


        let bn = (await (await sAsset.connect(dev5).approve(exchange.address, sBalance, gas)).wait()).blockNumber;

        if (i == 0) {
            let USDC_at_start = await usdc.balanceOf(poolAddress, {blockTag: bn});
            let USDP_at_start = await usdp.balanceOf(poolAddress, {blockTag: bn});

            let USDC_at_start_rounded = (Number(USDC_at_start) / 1e6)
            let USDP_at_start_rounded = (Number(USDP_at_start) / 1e6)

            console.log("USDC_at_start_rounded: ", USDC_at_start_rounded);
            console.log("USDP_at_start_rounded: ", USDP_at_start_rounded);

            swapStrategyAmountStart = USDC_at_start_rounded + USDP_at_start_rounded;

            let m2m = await getContract('Mark2Market', 'base_usdc');
            let assets = await m2m.strategyAssets({blockTag: bn});
            let cashNav = assets[0].netAssetValue; 

            let cashStrategyAmountStart_rounded = (Number(cashNav) / 1e6)
            cashStrategyAmountStart = cashStrategyAmountStart_rounded;

            console.log("swapStrategyAmountStart = ", swapStrategyAmountStart)
            console.log("cashStrategyAmountStart = ", cashStrategyAmountStart)
        }


        await new Promise(resolve => setTimeout(resolve, pauseTime)); // (?) А зачем делать эти паузы?
        
        bn = (await (await exchange.connect(dev5).buy(usdc.address, sBalance, gas)).wait()).blockNumber;
       
        await logCommon(bn, "| (after exchange)");
        

        // let dBalance = await dAsset.balanceOf(dev5Address);
        let dBalance = 100000000000;

        console.log("#0")
        console.log("DEBUG: dBalance =", dBalance);

        await new Promise(resolve => setTimeout(resolve, pauseTime));

        console.log("#1")
        bn = (await (await dAsset.connect(dev5).approve(swapper.address, dBalance, gas)).wait()).blockNumber;
    
        console.log("#2")
        await new Promise(resolve => setTimeout(resolve, pauseTime));
        console.log("#3")

        let dBalance3 = await dAsset.balanceOf(dev5Address);
        console.log("DEBUG: dBalance =", dBalance3);



        bn = (await (await swapper.connect(dev5).swap(poolAddress, dBalance, 0n, !isLeverageIncrease, gas)).wait()).blockNumber;
        



        
        // bn = (await (await swapper.connect(dev5).swap(poolAddress, dBalance, 0n, true, gas)).wait()).blockNumber;

                                                                //                     ???    
        console.log("#4")                                              
        await logCommon(bn, "| (after swap)");

    

        let N = Math.trunc(sBalance.toString() / 1e6);
        console.log("N = ", N);

        let cashTargetShare = (cashStrategyAmountStart / (swapStrategyAmountStart + i * N + cashStrategyAmountStart));
        let cashTargetWeight = cashTargetShare * 100000;

        console.log("cashTargetShare:     ", cashTargetShare);
        console.log("cashTargetWeight:    ", cashTargetWeight);

        await new Promise(resolve => setTimeout(resolve, pauseTime));

        let pm = await getContract('PortfolioManager', 'base_usdc');
        let strategyWeights = await pm.getAllStrategyWeights();
        let newWeights = JSON.parse(JSON.stringify(strategyWeights));
        let cashCurrentWeight = parseInt(newWeights[0][2].hex, 16);
        console.log("cashCurrentWeight:   ", cashCurrentWeight);
        
        let cashDiff = cashTargetWeight - cashCurrentWeight;
        console.log("cashDiff:            ", cashDiff);
    
        if (cashDiff <= -1) {
            console.log("Вес уменьшился больше чем на 1")
            let roundedCashDiff = Math.trunc(cashDiff)
            console.log("roundedCashDiff:     ", roundedCashDiff);
            console.log("уменьшаем вес...")
            await decrementWeight(roundedCashDiff);
            console.log("Вес уменьшен!")

            console.log("Проверяем результат...");
            let strategyWeights = await pm.getAllStrategyWeights();
            let newWeights = JSON.parse(JSON.stringify(strategyWeights));
            let cashStartWeight = parseInt(newWeights[0][2].hex, 16)
            console.log("Новый вес CASH-стратегии: ", cashStartWeight)

            
        }

        console.log("Балансируем...")
        bn = (await (await pm.connect(dev5).balance(gas)).wait()).blockNumber;
        console.log("Балансировка выполнена!")

        await new Promise(resolve => setTimeout(resolve, pauseTime));
        await logCommon(bn, "| (after balance)");
    }

    // 80024.923914

    let usdbBalance = await sAsset.balanceOf(dev5Address);
    console.log("USDB balance at the end: " + usdbBalance.toString());
}

async function decrementWeight(diff) {
    let pm = await getContract('PortfolioManager', 'base_usdc');
    let strategyWeights = await pm.getAllStrategyWeights();
    let newWeights = JSON.parse(JSON.stringify(strategyWeights));

    console.log("newWeights[0][2] =", newWeights[0][2]);
    console.log("diff =", diff);

    console.log("dW #1")

    newWeights[0][2] = BigNumber.from(newWeights[0][2]).add(diff);
    console.log("dW #2")

    newWeights[1][2] = BigNumber.from(newWeights[1][2]).sub(diff); // (?) Почему у Никиты тут было newWeights[4][2]
    console.log("dW #3")

    const provider = new ethers.providers.JsonRpcProvider(
        "http://localhost:8545"
    );
    console.log("dW #4")
    await provider.send("hardhat_impersonateAccount", ["0x086dFe298907DFf27BD593BD85208D57e0155c94"]);
    console.log("dW #5")
    const dev5 = provider.getSigner("0x086dFe298907DFf27BD593BD85208D57e0155c94");
    console.log("dW #6")

    await (await pm.connect(dev5).setStrategyWeights(newWeights)).wait();
    console.log("dW #7")
}

async function logBalances(type) {
    await new Promise(resolve => setTimeout(resolve, pauseTime));
    let wallet = await initWallet();

    let usdp = await getERC20ByAddress(BASE.usdcPlus, "0x086dFe298907DFf27BD593BD85208D57e0155c94");
    let usdc = await getERC20ByAddress(BASE.usdc, "0x086dFe298907DFf27BD593BD85208D57e0155c94");

    let usdPlusBalance = await usdp.balanceOf("0x086dFe298907DFf27BD593BD85208D57e0155c94");
    console.log(`USD+ balance ${type.toUpperCase()} SWAP: `, usdPlusBalance.toString());
    let usdbBalance = await usdc.balanceOf("0x086dFe298907DFf27BD593BD85208D57e0155c94");
    console.log(`USDB balance ${type.toUpperCase()} SWAP: `, usdbBalance.toString());
}

async function logCommon(bn, text) {
    let wallet = await initWallet();

    let usdp = await getERC20ByAddress(BASE.usdcPlus, "0x086dFe298907DFf27BD593BD85208D57e0155c94");
    let usdc = await getERC20ByAddress(BASE.usdc, "0x086dFe298907DFf27BD593BD85208D57e0155c94");
    let m2m = await getContract('Mark2Market', 'base_usdc');

    let assets = await m2m.strategyAssets({blockTag: bn});
    let totalNetAssets = await m2m.totalNetAssets({blockTag: bn});
    let cashNav = assets[0].netAssetValue; 
    // let strategyNav = assets[4].netAssetValue; // Cannot read properties of undefined (reading 'netAssetValue')

    let usdPlusPoolBalance = await usdp.balanceOf(poolAddress, {blockTag: bn});
    let usdcPoolBalance = await usdc.balanceOf(poolAddress, {blockTag: bn});

    console.log("bn=", bn,
        "usdp=",(Number(usdPlusPoolBalance) / 1e6).toFixed(0),
        "usdc=",(Number(usdcPoolBalance) / 1e6).toFixed(0),
        "cash=",(Number(cashNav) / 1e6).toFixed(0),
        // "str=",(Number(strategyNav) / 1e6).toFixed(0),
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



    // 99802
    // 99689


//     -----iteration  0 -----

//     bn= 25070418 usdp= 66819160 usdc= 48734 cash= 301875 nav= 67168329 | (before all)
//     bn= 25070420 usdp= 66819160 usdc= 48734 cash= 262076 nav= 67128530 | (after exchange)
//     bn= 25070422 usdp= 66779364 usdc= 88533 cash= 262076 nav= 67128530 | (after swap)

//     CASH target:  0.004494210891819119

//     bn= 25070423 usdp= 66779364 usdc= 48632 cash= 302078 nav= 67128526 | (after balance)

//     -----iteration  1 -----

//     bn= 25070423 usdp= 66779364 usdc= 48632 cash= 302078 nav= 67128526 | (before all)
//     bn= 25070425 usdp= 66779364 usdc= 48632 cash= 262286 nav= 67088735 | (after exchange)
//     bn= 25070427 usdp= 66739576 usdc= 88424 cash= 262286 nav= 67088735 | (after swap)
    
//     CASH target:  0.004496871533232875
    
//     bn= 25070428 usdp= 66739576 usdc= 48811 cash= 301899 nav= 67088739 | (after balance)

//     -----iteration  2 -----
    
//     bn= 25070428 usdp= 66739576 usdc= 48811 cash= 301899 nav= 67088739 | (before all)
//     bn= 25070430 usdp= 66739576 usdc= 48811 cash= 262115 nav= 67048954 | (after exchange)
//     bn= 25070432 usdp= 66699796 usdc= 88596 cash= 262115 nav= 67048954 | (after swap)
    
//     CASH target:  0.004499535326793367
    
//     bn= 25070433 usdp= 66699795 usdc= 48990 cash= 301720 nav= 67048958 | (after balance)

//     -----iteration  3 -----
    
//     bn= 25070433 usdp= 66699795 usdc= 48990 cash= 301720 nav= 67048958 | (before all)
//     bn= 25070435 usdp= 66699795 usdc= 48990 cash= 261944 nav= 67009181 | (after exchange)
//     bn= 25070437 usdp= 66660022 usdc= 88767 cash= 261944 nav= 67009181 | (after swap)
    
//     CASH target:  0.004502202278105591
    
//     bn= 25070438 usdp= 66660023 usdc= 49169 cash= 301541 nav= 67009185 | (after balance)

//     -----iteration  4 -----
    
//     bn= 25070438 usdp= 66660023 usdc= 49169 cash= 301541 nav= 67009185 | (before all)
//     bn= 25070440 usdp= 66660023 usdc= 49169 cash= 261772 nav= 66969416 | (after exchange)
//     bn= 25070442 usdp= 66620258 usdc= 88939 cash= 261772 nav= 66969416 | (after swap)
    
//     CASH target:  0.004504872392787834
    
//     bn= 25070443 usdp= 66620257 usdc= 49348 cash= 301362 nav= 66969420 | (after balance)

// CASH
//     301875
//     301362
// -513$

// USDC
//     48734
//     49348
// +614$

// USDP
//     66819160
//     66620257
// -198903$

