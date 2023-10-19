const { getContract, getPrice, showM2M, getChainId, initWallet, getERC20ByAddress, getERC20, transferAsset, transferETH } = require("@overnight-contracts/common/utils/script-utils");
const { createProposal, testProposal } = require("@overnight-contracts/common/utils/governance");
const { ARBITRUM } = require("@overnight-contracts/common/utils/assets");
const { toE6, toE18 } = require("@overnight-contracts/common/utils/decimals");
const { Roles } = require("@overnight-contracts/common/utils/roles");
const { getDataForSwap } = require("@overnight-contracts/common/utils/inch-helpers");
const { getNamedAccounts } = require("hardhat");

async function main() {


    let inchSwapper = await getContract('InchSwapper');
    // const { deployer } = await getNamedAccounts();

    // await transferETH(1, deployer);

    let wallet = await initWallet();

    // console.log(`GrantRole: UNIT_ROLE to ${wallet.address}`);
    // await (await inchSwapper.grantRole(Roles.UNIT_ROLE, wallet.address)).wait();
    const wstEth = await getERC20('wstEth');
    // await transferAsset(ARBITRUM.weth, wallet.address)
    // await transferAsset(ARBITRUM.wstEth, wallet.address)

    console.log(`Get Swap data`);
    let inchDataForSwapResponse0 = await getDataForSwap(
        await getChainId(),
        wallet.address,
        ARBITRUM.wstEth,
        ARBITRUM.weth,
        toE18(10),
        "ARBITRUM_UNISWAP_V3",
        "");

    console.log('Update path');
    await (await inchSwapper.updatePath({
        tokenIn: ARBITRUM.wstEth,
        tokenOut: ARBITRUM.weth,
        amount: toE18(10),
        flags: inchDataForSwapResponse0.flags,
        srcReceiver: inchDataForSwapResponse0.srcReceiver,
        pools: inchDataForSwapResponse0.pools,
        isUniV3: inchDataForSwapResponse0.isUniV3
    }, inchDataForSwapResponse0.data,)).wait();


    let amountIn = toE18(0.5);
    console.log(`Approve ${inchSwapper.address}: amount: [${amountIn}]`);
    await (await wstEth.approve(inchSwapper.address, amountIn)).wait();

    console.log(`Swap`);
    await (await inchSwapper.swap(wallet.address, ARBITRUM.wstEth, ARBITRUM.weth, amountIn, 1, { gasLimit: 15_000_000 })).wait();
}


main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });

