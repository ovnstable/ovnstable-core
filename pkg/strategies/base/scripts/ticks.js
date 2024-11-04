const {
    getContract,
    showM2M,
    execTimelock,
    getERC20ByAddress,
    initWallet,
    transferAsset
} = require("@overnight-contracts/common/utils/script-utils");
const {testProposal, createProposal} = require("@overnight-contracts/common/utils/governance");
const {fromE18, toE6, toE18, fromE6, fromAsset} = require("@overnight-contracts/common/utils/decimals");
const {BASE} = require("@overnight-contracts/common/utils/assets");
const {Roles} = require("@overnight-contracts/common/utils/roles");
const {prepareEnvironment} = require("@overnight-contracts/common/utils/tests");
const {ZERO_ADDRESS} = require("@openzeppelin/test-helpers/src/constants");
const {ethers} = require("hardhat");

async function main() {

    let wallet = await initWallet();

    let swap = await hre.ethers.getContractAt("AeroSwap", "0x73FBD6108C4af8C1c57F3a58561f7160031D04B2");
    
    let usdcPlus = await getERC20ByAddress(BASE.usdcPlus);

    
    console.log("usdc bal before:", (await usdcPlus.balanceOf(wallet.address)).toString());
    await transferAsset(BASE.usdcPlus, wallet.address);

    console.log("usdc bal after:", (await usdcPlus.balanceOf(wallet.address)).toString());

    let l = 0;
    let r = await usdcPlus.balanceOf(wallet.address);

    while (l < r) {
        let m = (l + r) / 2;

        swap.swap({
            pool: "0x8dd9751961621Fcfc394d90969E5ae0c5BAbE147",
            amountIn: m,
            sqrtPriceLimitX96: 0n,
            zeroForOne: true
        });
    }

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

