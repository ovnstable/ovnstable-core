const { getContract, initWallet, getERC20ByAddress, transferAsset, transferETH } = require("@overnight-contracts/common/utils/script-utils");
const { toAsset } = require("@overnight-contracts/common/utils/decimals");
const { BLAST } = require("@overnight-contracts/common/utils/assets");
const {Roles} = require("@overnight-contracts/common/utils/roles");
const hre = require("hardhat");

async function main() {
    let timelock = await getContract('AgentTimelock');
    // let iterations = 20;
    let iterations = 2;


    let poolAddress = '0x147e7416d5988b097b3a1859efecc2c5e04fdf96';

    let wallet = await initWallet();

    await transferETH(1, wallet.address);
    await transferETH(1, timelock.address);

    let pm = await getContract('PortfolioManager', 'blast');
    let thrusterSwap = await getContract('ThrusterSwap', 'blast'); 
    let exchange = await getContract('Exchange', 'blast');
    let usdPlus = await getERC20ByAddress('0x4fee793d435c6d2c10c135983bb9d6d4fc7b9bbd', wallet.address)
    let usdb = await getERC20ByAddress('0x4300000000000000000000000000000000000003', wallet.address)    

    let pool = await hre.ethers.getContractAt("ICLPoolThruster", poolAddress);

    await transferAsset(usdb.address, wallet.address, toAsset(100));

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

        await (await exchange.mint(
            { 
                asset: usdb.address, 
                amount: usdbBalance, 
                referral: ""
            }, 
            gas
        )).wait(); 

        console.log("USD+ minted and received USDB invested in CASH-strategies");

        let usdPlusBalance = await usdPlus.balanceOf(wallet.address);
        // usdPlusBalance = "10000000000000000000000";
        console.log("USD+ balance: ", usdPlusBalance.toString());
        
        await (await usdPlus.approve(thrusterSwap.address, usdPlusBalance, gas)).wait();
        console.log("USD+ approved to thrusterSwap");


        slot0 = await pool.slot0();
        console.log("Ratio before swap:  ", slot0[0].toString());

        await new Promise(resolve => setTimeout(resolve, 5000));

        await logBalances("Before");
        await (await thrusterSwap.swap(poolAddress, usdPlusBalance, 0n, false, gas)).wait();
        await logBalances("After");

        slot0 = await pool.slot0()
        console.log("Ratio after swap:   ", slot0[0].toString());





        // await (await pm.balance(gas)).wait();

        await hre.network.provider.request({
            method: "hardhat_impersonateAccount",
            params: [timelock.address],
        });

        const timelockAccount = await hre.ethers.getSigner(timelock.address);
        console.log("hardhat_impersonateAccount DONE")
        await (await pm.connect(timelockAccount).grantRole(await pm.PORTFOLIO_AGENT_ROLE(), timelockAccount.address));
        console.log("PORTFOLIO_AGENT_ROLE granted")
        await (await pm.connect(timelockAccount).balance(gas)).wait();

        await hre.network.provider.request({
            method: "hardhat_stopImpersonatingAccount",
            params: [timelock.address],
        });






        slot0 = await pool.slot0()
        console.log("Ratio after balance:", slot0[0].toString());

        console.log("waiting for 3 seconds...");
        await new Promise(resolve => setTimeout(resolve, 3000)); // Wait 3 seconds between iterations

        let usdbBalanceTMP = await usdb.balanceOf(wallet.address);
        console.log("USDB balance at the end of iteration: " + usdbBalanceTMP.toString());
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
