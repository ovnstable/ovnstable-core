const {
    getContract,
    showM2M,
    execTimelock,
    getERC20ByAddress,
    initWallet,
    transferAsset,
    transferETH
} = require("@overnight-contracts/common/utils/script-utils");
const {testProposal, createProposal} = require("@overnight-contracts/common/utils/governance");
const {fromE18, toE6, toE18, fromE6, fromAsset} = require("@overnight-contracts/common/utils/decimals");
const {BASE} = require("@overnight-contracts/common/utils/assets");
const {Roles} = require("@overnight-contracts/common/utils/roles");
const {prepareEnvironment} = require("@overnight-contracts/common/utils/tests");
const {ZERO_ADDRESS} = require("@openzeppelin/test-helpers/src/constants");
const {ethers} = require("hardhat");
const { BigNumber } = require("ethers");

async function main() {

    let wallet = await initWallet();
    await transferETH(1, wallet.address);

    let swap = await getContract("AeroSwap");
    let pool = await hre.ethers.getContractAt("ICLPool", "0x8dd9751961621Fcfc394d90969E5ae0c5BAbE147");
    
    let usdc = await getERC20ByAddress(BASE.usdc);

    
    console.log("usdc bal before:", (await usdc.balanceOf(wallet.address)).toString());
    await transferAsset(BASE.usdc, wallet.address);

    console.log("usdc bal after:", (await usdc.balanceOf(wallet.address)).toString());

    await usdc.approve("0x7c8FB2fb6d6050F114d94F66aDc07cBA82dd6F58", await usdc.balanceOf(wallet.address));

    let l = 0n;
    let r = 240_000_000_000n;

    // 79228330544119692696067828937
    // console.log(r.toString())
    let slot0 = await pool.slot0();
    console.log("before:", slot0[0].toString())

    // while (l < r) {
        // let m = ((l + r) / 2n);
        // console.log(m)

        await swap.swap(
            "0x8dd9751961621Fcfc394d90969E5ae0c5BAbE147",
            BigNumber.from(r),
            0n,
            true,
            {gasLimit: 30000000}
        );

        slot0 = await pool.slot0();

        console.log("after: ", slot0[0].toString())

        // if (slot0 < 79224201403219477170569942574n) {
        //     r = m;
        // } else {
        //     l = m;
        // }

    // }

    // await (await strategy.setStrategyParams(wallet.address, roleManager.address)).wait();

    // await usdc.connect(wallet).transfer(strategy.address, toE6(1));

    // console.log((await strategy.swapRouter()).toString());
    // console.log((await strategy.netAssetValue()).toString());

    // await strategy.stake(BASE.usdc, toE6(1));
    // console.log((await strategy.netAssetValue()).toString());

    // await strategy.unstake(BASE.usdc, 0, wallet.address, true);
    // console.log((await strategy.netAssetValue()).toString());

    // await (await strategy.setStrategyParams(pm.address, roleManager.address)).wait();
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });

