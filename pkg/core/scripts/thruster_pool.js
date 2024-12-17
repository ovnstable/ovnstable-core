const { getContract, initWallet, getERC20ByAddress, transferAsset, transferETH } = require("@overnight-contracts/common/utils/script-utils");
const { toAsset } = require("@overnight-contracts/common/utils/decimals");
const { BLAST } = require("@overnight-contracts/common/utils/assets");
const {Roles} = require("@overnight-contracts/common/utils/roles");
const hre = require("hardhat");

async function main() {

    let wallet = await initWallet();

    let iterations = 6;
    let poolAddress = '0x147e7416d5988b097b3a1859efecc2c5e04fdf96';
    
    let pm = await getContract('PortfolioManager', 'blast');
    let thrusterSwap = await getContract('ThrusterSwap', 'blast'); 
    let exchange = await getContract('Exchange', 'blast');
    let usdPlus = await getERC20ByAddress('0x4fee793d435c6d2c10c135983bb9d6d4fc7b9bbd', wallet.address)
    let usdb = await getERC20ByAddress('0x4300000000000000000000000000000000000003', wallet.address)    
    let pool = await hre.ethers.getContractAt("ICLPoolThruster", poolAddress);

    let gas = {
        gasLimit: 20000000,
        maxFeePerGas: "38000000",
        maxPriorityFeePerGas: "1300000",
    }

    for (let i = 0; i < iterations; i++) {
        console.log("-----iteration ", i, "-----");

        let usdbBalance = await usdb.balanceOf(wallet.address);
        console.log("USDB balance: ", usdbBalance.toString());

        await (await usdb.approve(exchange.address, usdbBalance, gas)).wait();
        console.log("USDB approved to exchange");

        await (await exchange.buy(usdb.address, usdbBalance, gas)).wait(); 
        console.log("USD+ minted and received USDB invested in CASH-strategies");

        let usdPlusBalance = await usdPlus.balanceOf(wallet.address);
        console.log("USD+ balance: ", usdPlusBalance.toString());
        
        await (await usdPlus.approve(thrusterSwap.address, usdPlusBalance, gas)).wait();
        console.log("USD+ approved to thrusterSwap");

        let slot0 = await pool.slot0();
        console.log("Ratio before swap:  ", slot0[0].toString());

        await new Promise(resolve => setTimeout(resolve, 5000));

        await logBalances("Before");
        await (await thrusterSwap.swap(poolAddress, usdPlusBalance, 0n, false, gas)).wait();
        await logBalances("After");

        slot0 = await pool.slot0();
        console.log("Ratio after swap:   ", slot0[0].toString());

        await (await pm.balance(gas)).wait();

        slot0 = await pool.slot0();
        console.log("Ratio after balance:", slot0[0].toString());

        console.log("waiting for 3 seconds...");
        await new Promise(resolve => setTimeout(resolve, 3000)); // Wait 3 seconds between iterations
    }

    let usdbBalance = await usdb.balanceOf(wallet.address);
    console.log("USDB balance at the end: " + usdbBalance.toString());
    
}

async function logBalances(type) {
    let wallet = await initWallet();

    let usdPlus = await getERC20ByAddress('0x4fee793d435c6d2c10c135983bb9d6d4fc7b9bbd', wallet.address)
    let usdb = await getERC20ByAddress('0x4300000000000000000000000000000000000003', wallet.address) 

    let usdPlusBalance = await usdPlus.balanceOf(wallet.address);
    console.log(`USD+ balance ${type.toUpperCase()} SWAP: `, usdPlusBalance.toString());
    let usdbBalance = await usdb.balanceOf(wallet.address);
    console.log(`USDB balance ${type.toUpperCase()} SWAP: `, usdbBalance.toString());
}



main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
