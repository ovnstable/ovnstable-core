const {
    getContract,
    transferAsset,
    initWallet,
    impersonateAccount,
    getERC20ByAddress,
    transferETH
} = require("@overnight-contracts/common/utils/script-utils");
const { BASE } = require("@overnight-contracts/common/utils/assets");
const { toAsset } = require("@overnight-contracts/common/utils/decimals");
const hre = require("hardhat");

async function main() {
    
    let iterations = 100;

    let poolAddress = "0x8dd9751961621Fcfc394d90969E5ae0c5BAbE147";
    let devAddress = "0x086dFe298907DFf27BD593BD85208D57e0155c94";

    let wallet = await initWallet();
    let pm = await getContract('PortfolioManager', 'base_usdc');
    let aeroSwap = await getContract('AeroSwap', 'base');
    let exchange = await getContract('Exchange', 'base_usdc');
    let usdcPlus = await getContract('UsdPlusToken', 'base_usdc');
    let usdc = await getERC20ByAddress(BASE.usdc, wallet.address);
    let pool = await hre.ethers.getContractAt("ICLPool", poolAddress);

    // await aeroSwap.setSimulationParams(BASE.aerodromeFactory);
    
    // const dev5 = await impersonateAccount(devAddress);

    // await transferETH(10, wallet.address);
    // await transferETH(10, devAddress);

    // await transferAsset(BASE.usdc, wallet.address, toAsset(amount * 10));

    // let gas = { gasLimit: 20000000, gasPrice: 10000000, gasPriorityFee: 10000000, maxFeePerGas: 100000000, maxPriorityFeePerGas: 10000000};
    

    let provider = new hre.ethers.providers.StaticJsonRpcProvider(process.env.ETH_NODE_URI_BASE);
    let gasPrice = await provider.getGasPrice();
    let feeData = await provider.getFeeData();

    let gas = { 
        // gasLimit: 20000000,
        // baseFeePerGas: "7122959",
        // maxFeePerGas: feeData.maxFeePerGas,
        // maxPriorityFeePerGas: feeData.maxPriorityFeePerGas,
        maxFeePerGas: "19500000",
        maxPriorityFeePerGas: "1200000",
    };

    console.log("maxFeePerGas", gas.maxFeePerGas.toString());
    console.log("maxPriorityFeePerGas", gas.maxPriorityFeePerGas.toString());

    console.log("gasPrice", gasPrice.toString());
    console.log("feeData", feeData);


    for (let i = 0; i < iterations; i++) {
        console.log("-----iteration ", i, "-----");
        let balanceInit = await usdc.balanceOf(wallet.address);
        let amount = balanceInit.toString();
        let balanceAfterTransfer = await usdc.balanceOf(wallet.address);
        console.log("balanceInit " + balanceInit.toString());
        console.log("balanceAfterTransfer " + balanceAfterTransfer.toString());
        
        let plusBalance1 = await usdcPlus.balanceOf(wallet.address);
        console.log("usdc+ bal before: ", plusBalance1.toString());

        await (await usdc.approve(exchange.address, amount, gas)).wait();
        console.log("approve usdc", amount);

        await (await exchange.mint({
            asset: usdc.address,
            amount: amount,
            referral: ''
        }, gas)).wait();
        console.log("mint usdc+");
        

        let plusBalance2 = await usdcPlus.balanceOf(wallet.address);
        

        let usdcplusAmount = (plusBalance2).toString();

        console.log("usdcplusAmount " + usdcplusAmount.toString());

        await (await usdcPlus.approve(aeroSwap.address, usdcplusAmount, gas)).wait();
        
        slot0 = await pool.slot0();
        console.log("price before swap: ", slot0[0].toString());

        await (await aeroSwap.swap(poolAddress, usdcplusAmount, 0n, false, gas)).wait();

        slot0 = await pool.slot0();
        console.log("price after swap: ", slot0[0].toString());

        await (await pm.balance(gas)).wait();

        slot0 = await pool.slot0();
        console.log("price after balance: ", slot0[0].toString());


        let usdcBalance = await usdc.balanceOf(wallet.address);
        console.log("usdcBalance", usdcBalance.toString());
        console.log("waiting 5 seconds");
        await new Promise(resolve => setTimeout(resolve, 5000)); // Wait 5 seconds between iterations
    }

    let balanceFinish = await usdc.balanceOf(wallet.address);
    console.log("balanceFinish " + balanceFinish.toString());
}


main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });

