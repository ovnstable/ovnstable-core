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
    let amount = 10000;
    let iterations = 10;

    let poolAddress = "0x8dd9751961621Fcfc394d90969E5ae0c5BAbE147";
    let devAddress = "0x086dFe298907DFf27BD593BD85208D57e0155c94";

    let wallet = await initWallet();
    let pm = await getContract('PortfolioManager', 'base_usdc');
    let aeroSwap = await getContract('AeroSwap', 'base');
    let exchange = await getContract('Exchange', 'base_usdc');
    let usdcPlus = await getContract('UsdPlusToken', 'base_usdc');
    let usdc = await getERC20ByAddress(BASE.usdc, wallet.address);
    let pool = await hre.ethers.getContractAt("ICLPool", poolAddress);

    await aeroSwap.setSimulationParams(BASE.aerodromeFactory);
    
    const dev5 = await impersonateAccount(devAddress);

    await transferETH(10, wallet.address);
    await transferETH(10, devAddress);


    let balanceInit = await usdc.balanceOf(wallet.address);

    await transferAsset(BASE.usdc, wallet.address, toAsset(amount * 10));

    let balanceAfterTransfer = await usdc.balanceOf(wallet.address);


    console.log("balanceInit " + balanceInit.toString());
    console.log("balanceAfterTransfer " + balanceAfterTransfer.toString());


    for (let i = 0; i < iterations; i++) {
        let plusBalance1 = await usdcPlus.balanceOf(wallet.address);
        console.log("usdc+ bal before: ", plusBalance1.toString());

        await (await usdc.connect(wallet).approve(exchange.address, toAsset(amount))).wait();
        console.log("approve usdc", toAsset(amount));

        await (await exchange.connect(wallet).mint({
            asset: usdc.address,
            amount: toAsset(amount),
            referral: ''
        })).wait();
        console.log("mint usdc+");
        

        let plusBalance2 = await usdcPlus.balanceOf(wallet.address);
        

        let usdcplusAmount = (plusBalance2 - plusBalance1).toString();

        console.log("usdcplusAmount " + usdcplusAmount.toString());

        await (await usdcPlus.connect(wallet).approve(aeroSwap.address, usdcplusAmount)).wait();
        
        slot0 = await pool.slot0();
        console.log("price before swap: ", slot0[0].toString());

        await (await aeroSwap.swap(poolAddress, usdcplusAmount, 0n, false)).wait();

        slot0 = await pool.slot0();
        console.log("price after swap: ", slot0[0].toString());

        await (await pm.connect(dev5).balance()).wait();
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

