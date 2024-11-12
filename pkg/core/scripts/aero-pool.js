const {
    getContract,
    transferAsset,
    initWallet,
    getCoreAsset,
    impersonateAccount
} = require("@overnight-contracts/common/utils/script-utils");
const { BASE } = require("@overnight-contracts/common/utils/assets");
const { toAsset } = require("@overnight-contracts/common/utils/decimals");
const hre = require("hardhat");

async function main() {
    let amount = 10000;
    let iterations = 1;

    let pm = await getContract('PortfolioManager');
    let aeroSwap = await getContract('AeroSwap');
    let exchange = await getContract('Exchange', 'base_usdc');
    let usdcplus = await getContract('UsdPlusToken', 'base_usdc');
    let usdc = await getCoreAsset();
    let poolAddress = "0x8dd9751961621Fcfc394d90969E5ae0c5BAbE147";
    let devAddress = "0x086dFe298907DFf27BD593BD85208D57e0155c94";
    // let wallet = await initWallet();

    const signers = await ethers.getSigners();
    const wallet = signers[0];

    const dev5 = await impersonateAccount(devAddress);


    let balInit = await usdc.balanceOf(wallet.address);

    await transferAsset(BASE.usdc, wallet.address, toAsset(amount));

    let balAfterTransfer = await usdc.balanceOf(wallet.address);


    console.log("balInit " + balInit.toString());
    console.log("balAfterTransfer " + balAfterTransfer.toString());

    for (let i = 0; i < iterations; i++) {
        let plusBalance1 = await usdcplus.balanceOf(wallet.address);

        await (await usdc.approve(exchange.address, toAsset(amount))).wait();
        console.log("approve usdc");

        await (await exchange.mint({
            asset: usdc.address,
            amount: toAsset(amount),
            referral: ''
        })).wait();
        console.log("mint");

        let plusBalance2 = await usdcplus.balanceOf(wallet.address);

        let usdcplusAmount = (plusBalance2 - plusBalance1).toString();

        console.log("usdcplusAmount " + usdcplusAmount.toString());

        await (await usdcplus.approve(aeroSwap.address, usdcplusAmount)).wait();
        console.log("approve usdcplus");

        await (await aeroSwap.swap(poolAddress, usdcplusAmount, 0n, false)).wait();
        console.log("swap");

        await (await pm.connect(dev5).balance()).wait();
        console.log("rebalance");
    }

    let balFinish = await usdc.balanceOf(wallet.address);
    console.log("balFinish " + balFinish.toString());
}


main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });

