const { getContract, initWallet, getERC20ByAddress } = require("@overnight-contracts/common/utils/script-utils");
const { BASE } = require("@overnight-contracts/common/utils/assets");
const hre = require("hardhat");
const { engineSendTxSigned } = require("@overnight-contracts/common/utils/engine");
const { BigNumber } = require("ethers");

let poolAddress = "0x8dd9751961621Fcfc394d90969E5ae0c5BAbE147";

async function main() {


    // await decrementWeight(10);
    // return;
    console.log("blockNumber: ", await hre.ethers.provider.getBlockNumber());
    await logCommon(await hre.ethers.provider.getBlockNumber(), "| (start)");
    // return;
    
    let isLeverageIncrease = false;

    let iterations = 100;

    let wallet = await initWallet();
    let pm = await getContract('PortfolioManager', 'base_usdc');
    let swapper = await getContract('AeroSwap', 'base');
    let exchange = await getContract('Exchange', 'base_usdc');
    let usdp = await getERC20ByAddress(BASE.usdcPlus, wallet.address);
    let usdc = await getERC20ByAddress(BASE.usdc, wallet.address);
    let pool = await hre.ethers.getContractAt("@overnight-contracts/connectors/contracts/stuff/Aerodrome.sol:ICLPool", poolAddress);

    let sAsset = isLeverageIncrease ? usdc : usdp;
    let dAsset = isLeverageIncrease ? usdp : usdc;

    let gas = {
        gasLimit: 35000000,
        maxFeePerGas: "38000000",
        maxPriorityFeePerGas: "1300000",
    }

    for (let i = 0; i < iterations; i++) {
        console.log("-----iteration ", i, "-----");

        await logCommon(await hre.ethers.provider.getBlockNumber(), "| (before all)");
        let sBalance = await sAsset.balanceOf(wallet.address);
        // sBalance = "10000000000";
        console.log("USDB balance: ", sBalance.toString());

        await new Promise(resolve => setTimeout(resolve, 3000));
        let bn = (await (await sAsset.approve(exchange.address, sBalance, gas)).wait()).blockNumber;
        console.log("USDB approved to exchange");

        await new Promise(resolve => setTimeout(resolve, 3000));
        if (isLeverageIncrease) {
            bn = (await (await exchange.buy(usdc.address, sBalance, gas)).wait()).blockNumber;
        } else {
            bn = (await (await exchange.redeem(usdc.address, sBalance, gas)).wait()).blockNumber;
        }
        await logCommon(bn, "| (after exchange)");
        console.log("USD+ minted and received USDB invested in CASH-strategies");

        let dBalance = await dAsset.balanceOf(wallet.address);
        // dBalance = "10000000000";
        console.log("USD+ balance: ", dBalance.toString());
        
        await new Promise(resolve => setTimeout(resolve, 3000));
        bn = (await (await dAsset.approve(swapper.address, dBalance, gas)).wait()).blockNumber;
        console.log("USD+ approved to swapper");

        globalState = await pool.slot0();
        console.log("Ratio before swap:  ", globalState[0].toString());

        await new Promise(resolve => setTimeout(resolve, 3000));
        bn = (await (await swapper.swap(poolAddress, dBalance, 0n, !isLeverageIncrease, gas)).wait()).blockNumber;
        await logCommon(bn, "| (after swap)");

        globalState = await pool.slot0();
        console.log("Ratio after swap:   ", globalState[0].toString());

        await new Promise(resolve => setTimeout(resolve, 3000));
        // await decrementWeight(10);
        await new Promise(resolve => setTimeout(resolve, 3000));
        bn = (await (await pm.balance(gas)).wait()).blockNumber;
        await logCommon(bn, "| (after balance)");

        globalState = await pool.slot0();
        console.log("Ratio after balance:", globalState[0].toString());

        console.log("waiting for 3 seconds...");
        await new Promise(resolve => setTimeout(resolve, 3000)); // Wait 3 seconds between iterations

        let usdbBalanceTMP = await sAsset.balanceOf(wallet.address);
        console.log("USDB balance at the end of iteration: " + usdbBalanceTMP.toString());
    }

    let usdbBalance = await sAsset.balanceOf(wallet.address);
    console.log("USDB balance at the end: " + usdbBalance.toString());
}

async function decrementWeight(diff) {
    
    let pm = await getContract('PortfolioManager', 'base_usdc');
    let strategyWeights = await pm.getAllStrategyWeights();
    let newWeights = JSON.parse(JSON.stringify(strategyWeights));
    
    newWeights[0][2] = BigNumber.from(newWeights[0][2]).add(diff);
    newWeights[4][2] = BigNumber.from(newWeights[4][2]).sub(diff);

    await (await pm.setStrategyWeights(newWeights)).wait();
}

async function logBalances(type) {
    await new Promise(resolve => setTimeout(resolve, 3000));
    let wallet = await initWallet();

    let usdp = await getERC20ByAddress(BASE.usdcPlus, wallet.address);
    let usdc = await getERC20ByAddress(BASE.usdc, wallet.address);

    let usdPlusBalance = await usdp.balanceOf(wallet.address);
    console.log(`USD+ balance ${type.toUpperCase()} SWAP: `, usdPlusBalance.toString());
    let usdbBalance = await usdc.balanceOf(wallet.address);
    console.log(`USDB balance ${type.toUpperCase()} SWAP: `, usdbBalance.toString());
}

async function logCommon(bn, text) {
    let wallet = await initWallet();

    let usdp = await getERC20ByAddress(BASE.usdcPlus, wallet.address);
    let usdc = await getERC20ByAddress(BASE.usdc, wallet.address);
    let m2m = await getContract('Mark2Market', 'base_usdc');

    let assets = await m2m.strategyAssets({blockTag: bn});
    let totalNetAssets = await m2m.totalNetAssets({blockTag: bn});
    let cashNav = assets[0].netAssetValue;
    let strategyNav = assets[4].netAssetValue;

    let usdPlusPoolBalance = await usdp.balanceOf(poolAddress, {blockTag: bn});
    let usdcPoolBalance = await usdc.balanceOf(poolAddress, {blockTag: bn});

    console.log("bn=", bn,
        "usdp=",(Number(usdPlusPoolBalance) / 1e6).toFixed(0),
        "usdc=",(Number(usdcPoolBalance) / 1e6).toFixed(0),
        "cash=",(Number(cashNav) / 1e6).toFixed(0),
        "str=",(Number(strategyNav) / 1e6).toFixed(0),
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
