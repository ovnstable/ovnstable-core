const { getContract, getPrice, showM2M, getChainId, initWallet, getERC20ByAddress } = require("@overnight-contracts/common/utils/script-utils");
const { createProposal, testProposal } = require("@overnight-contracts/common/utils/governance");
const { BASE } = require("@overnight-contracts/common/utils/assets");
const { toE6 } = require("@overnight-contracts/common/utils/decimals");
const { Roles } = require("@overnight-contracts/common/utils/roles");
const { getDataForSwap } = require("@overnight-contracts/common/utils/inch-helpers");

async function main() {


    let inchSwapper = await getContract('InchSwapper');

    let wallet = await initWallet();

    console.log(`GrantRole: UNIT_ROLE to ${wallet.address}`);
    await (await inchSwapper.grantRole(Roles.UNIT_ROLE, wallet.address)).wait();

    console.log(`Get Swap data`);
    let inchDataForSwapResponse0 = await getDataForSwap(
        await getChainId(),
        wallet.address,
        BASE.usdbc,
        BASE.dai,
        toE6(1_000_000),
        "BASE_UNISWAP_V3",
        "");

    console.log('Update path');
    await (await inchSwapper.updatePath({
        tokenIn: BASE.usdbc,
        tokenOut: BASE.dai,
        amount: toE6(1_000_000),
        flags: inchDataForSwapResponse0.flags,
        srcReceiver: inchDataForSwapResponse0.srcReceiver
    }, inchDataForSwapResponse0.data,)).wait();


    let usdbc = await getERC20ByAddress(BASE.usdbc);
    let amountIn = toE6(1);
    console.log(`Approve ${inchSwapper.address}: amount: [${amountIn}]`);
    await (await usdbc.approve(inchSwapper.address, amountIn)).wait();

    console.log(`Swap`);
    await (await inchSwapper.swap(wallet.address, BASE.usdbc, BASE.dai, amountIn, 10, { gasLimit: 15_000_000 })).wait();
}


main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });

