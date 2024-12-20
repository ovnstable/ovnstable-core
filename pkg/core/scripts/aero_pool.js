const { getContract, initWallet, getERC20ByAddress } = require("@overnight-contracts/common/utils/script-utils");
const { BASE } = require("@overnight-contracts/common/utils/assets");
const hre = require("hardhat");
const { engineSendTxSigned } = require("@overnight-contracts/common/utils/engine");

async function main() {
    
    let isLeverageIncrease = false;

    let iterations = 100;

    let poolAddress = "0x8dd9751961621Fcfc394d90969E5ae0c5BAbE147";

    let wallet = await initWallet();
    let pm = await getContract('PortfolioManager', 'base_usdc');
    let aeroSwap = await getContract('AeroSwap', 'base');
    let exchange = await getContract('Exchange', 'base_usdc');
    let usdp = await getContract('UsdPlusToken', 'base_usdc');
    let usdc = await getERC20ByAddress(BASE.usdc, wallet.address);
    let pool = await hre.ethers.getContractAt("ICLPool", poolAddress);

    let sAsset = isLeverageIncrease ? usdc : usdp;
    let dAsset = isLeverageIncrease ? usdp : usdc;

    let gas = {
        gasLimit: 20000000,
        maxFeePerGas: "38000000",
        maxPriorityFeePerGas: "1300000",
    }

    for (let i = 0; i < iterations; i++) {
        console.log("-----iteration ", i, "-----");
        let sBalance = await sAsset.balanceOf(wallet.address);
        console.log("Source asset balance", sBalance.toString());

        await (await sAsset.approve(exchange.address, sBalance, gas)).wait();
        console.log("Source asset approved");

        await (await exchange.redeem(usdc.address, sBalance, gas)).wait();
        console.log("Source asset redeemed");

        let dBalance = await dAsset.balanceOf(wallet.address);
        console.log("Destination asset balance", dBalance.toString());
        
        await (await dAsset.approve(aeroSwap.address, dBalance, gas)).wait();
        console.log("Destination asset approved");
        
        slot0 = await pool.slot0();
        console.log("Ratio before swap:  ", slot0[0].toString());

        await (await aeroSwap.swap(poolAddress, dBalance, 0n, !isLeverageIncrease, gas)).wait();

        slot0 = await pool.slot0();
        console.log("Ratio after swap:   ", slot0[0].toString());

        await (await pm.balance(gas)).wait();

        slot0 = await pool.slot0();
        console.log("Ratio after balance:", slot0[0].toString());

        console.log("waiting for 5 seconds...");
        await new Promise(resolve => setTimeout(resolve, 5000)); // Wait 5 seconds between iterations
    }

    let balanceFinish = await sAsset.balanceOf(wallet.address);
    console.log("balanceFinish " + balanceFinish.toString());
}


main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });

