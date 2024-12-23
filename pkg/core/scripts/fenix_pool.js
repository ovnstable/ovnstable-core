const { getContract, initWallet, getERC20ByAddress, transferAsset, transferETH } = require("@overnight-contracts/common/utils/script-utils");
const { toAsset } = require("@overnight-contracts/common/utils/decimals");
const { BLAST } = require("@overnight-contracts/common/utils/assets");
const {Roles} = require("@overnight-contracts/common/utils/roles");
const hre = require("hardhat");

const poolAddress = '0x6a1de1841c5c3712e3bc7c75ce3d57dedec6915f';

async function main() {

    // await logCommon();
    // return;

    let iterations = 10;

    let wallet = await initWallet();
    let pm = await getContract('PortfolioManager', 'blast');
    let fenixSwap = await getContract('FenixSwap', 'blast');
    let exchange = await getContract('Exchange', 'blast');
    let usdPlus = await getERC20ByAddress('0x4fee793d435c6d2c10c135983bb9d6d4fc7b9bbd', wallet.address);
    let usdb = await getERC20ByAddress('0x4300000000000000000000000000000000000003', wallet.address);
    let pool = await hre.ethers.getContractAt("ICLPoolFenix", poolAddress);

    let gas = {
        gasLimit: 20000000,
        maxFeePerGas: "38000000",
        maxPriorityFeePerGas: "1300000",
    }

    for (let i = 0; i < iterations; i++) {
        console.log("-----iteration ", i, "-----");

        let bbn = await hre.ethers.provider.getBlockNumber();
        await logCommon(bbn);
        let usdbBalance = await usdb.balanceOf(wallet.address);
        // usdbBalance = "10000000000000000000000";
        console.log("USDB balance: ", usdbBalance.toString());

        await new Promise(resolve => setTimeout(resolve, 3000));
        let bn = (await (await usdb.approve(exchange.address, usdbBalance, gas)).wait()).blockNumber;
        console.log("USDB approved to exchange");

        await new Promise(resolve => setTimeout(resolve, 3000));
        bn = (await (await exchange.buy(usdb.address, usdbBalance, gas)).wait()).blockNumber;
        await logCommon(bn);
        console.log("USD+ minted and received USDB invested in CASH-strategies");

        let usdPlusBalance = await usdPlus.balanceOf(wallet.address);
        // usdPlusBalance = "40000000000000000000000";
        console.log("USD+ balance: ", usdPlusBalance.toString());
        
        await new Promise(resolve => setTimeout(resolve, 3000));
        bn = (await (await usdPlus.approve(fenixSwap.address, usdPlusBalance, gas)).wait()).blockNumber;
        // await logCommon(bn);
        console.log("USD+ approved to fenixSwap");

        globalState = await pool.globalState();
        console.log("Ratio before swap:  ", globalState[0].toString());

        // await logBalances("Before");
        await new Promise(resolve => setTimeout(resolve, 3000));
        bn = (await (await fenixSwap.swap(poolAddress, usdPlusBalance, 0n, false, gas)).wait()).blockNumber;
        await logCommon(bn);
        // await logBalances("After");

        globalState = await pool.globalState()
        console.log("Ratio after swap:   ", globalState[0].toString());

        await new Promise(resolve => setTimeout(resolve, 3000));
        bn = (await (await pm.balance(gas)).wait()).blockNumber;
        await logCommon(bn);

        globalState = await pool.globalState()
        console.log("Ratio after balance:", globalState[0].toString());

        console.log("waiting for 3 seconds...");
        await new Promise(resolve => setTimeout(resolve, 3000)); // Wait 3 seconds between iterations

        let usdbBalanceTMP = await usdb.balanceOf(wallet.address);
        console.log("USDB balance at the end of iteration: " + usdbBalanceTMP.toString());
    }

    let usdbBalance = await usdb.balanceOf(wallet.address);
    console.log("USDB balance at the end: " + usdbBalance.toString());
}

async function logBalances(type) {
    await new Promise(resolve => setTimeout(resolve, 3000));
    let wallet = await initWallet();

    let usdPlus = await getERC20ByAddress('0x4fee793d435c6d2c10c135983bb9d6d4fc7b9bbd', wallet.address)
    let usdb = await getERC20ByAddress('0x4300000000000000000000000000000000000003', wallet.address) 

    let usdPlusBalance = await usdPlus.balanceOf(wallet.address);
    console.log(`USD+ balance ${type.toUpperCase()} SWAP: `, usdPlusBalance.toString());
    let usdbBalance = await usdb.balanceOf(wallet.address);
    console.log(`USDB balance ${type.toUpperCase()} SWAP: `, usdbBalance.toString());
}

async function logCommon(bn) {
    let wallet = await initWallet();



    let usdPlus = await getERC20ByAddress('0x4fee793d435c6d2c10c135983bb9d6d4fc7b9bbd', wallet.address);
    let usdb = await getERC20ByAddress('0x4300000000000000000000000000000000000003', wallet.address);
    let m2m = await getContract('Mark2Market', 'blast');

    let assets = await m2m.strategyAssets({blockTag: bn});
    let totalNetAssets = await m2m.totalNetAssets({blockTag: bn});
    let cashNav = assets[0].netAssetValue;
    let strategyNav = assets[3].netAssetValue;

    // console.log("assets: ", assets);
    // console.log("cashNav: ", cashNav.toString());
    // console.log("strategyNav: ", strategyNav.toString());
    // console.log("totalNetAssets: ", totalNetAssets.toString());
    

    let usdPlusPoolBalance = await usdPlus.balanceOf(poolAddress, {blockTag: bn});
    let usdbPoolBalance = await usdb.balanceOf(poolAddress, {blockTag: bn});

    console.log("bn=", bn,
        "usdp=",(Number(usdPlusPoolBalance) / 1e18).toFixed(0),
        "usdb=",(Number(usdbPoolBalance) / 1e18).toFixed(0),
        "cash=",(Number(cashNav) / 1e18).toFixed(0),
        "str=",(Number(strategyNav) / 1e18).toFixed(0),
        "nav=",(Number(totalNetAssets) / 1e18).toFixed(0)
    );
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });

