//const { fromE18, toE18, fromAsset, fromE6, toAsset } = require("./decimals");
const { toE6, fromE6, fromE18, toAsset, toE18, fromAsset } = require("@overnight-contracts/common/utils/decimals");

const { expect } = require("chai");
const { transferETH, execTimelock, showM2M, getContract, initWallet, getPrice, impersonateAccount, getWalletAddress, getCoreAsset, getAsset, getERC20, convertWeights } = require("@overnight-contracts/common/utils/script-utils");
const hre = require('hardhat');
const { getTestAssets, createRandomWallet } = require("@overnight-contracts/common/utils/tests");

async function printTokenBalance(tokenContract, walletAddress) {
    const promises = await Promise.all([tokenContract.balanceOf(walletAddress), tokenContract.decimals(), tokenContract.symbol()]);
    console.log(`${promises[2]} balance is ${hre.ethers.utils.formatUnits(promises[0], promises[1])}`);
}

function formatOvn(value) {
    return hre.ethers.utils.formatUnits(value, 18);
}

async function main() {
    let wallet = await initWallet();

    // await transferETH(1, wallet.address);
    // return;

    const strategy = await getContract('StrategySwapToOvn', "base_ovn");

    let ovnToken = await getCoreAsset("base_ovn");
    let ovnPlusToken = await getERC20("ovnPlus");
    let usdPlusToken = await getERC20("usdPlus");

    console.log('\n OVN+ total supply:', fromE18(await ovnPlusToken.totalSupply()));
    
    console.log("\n my tokens:")
    await printTokenBalance(ovnToken, wallet.address);
    await printTokenBalance(ovnPlusToken, wallet.address);
    await printTokenBalance(usdPlusToken, wallet.address);

    // transfer 9 USD+ to my strategy
//    await usdPlusToken.transfer(strategy.address, toE6(9));

    console.log("\n", "strategy:")
    await printTokenBalance(ovnToken, strategy.address);
    await printTokenBalance(usdPlusToken, strategy.address);
    console.log(`NAV: ${formatOvn(await strategy.netAssetValue())}`);
    
    // console.log("\n", "strategy:")
    // await printTokenBalance(ovnToken, strategy.address);
    // await printTokenBalance(usdPlusToken, strategy.address);
    // console.log(`NAV: ${formatOvn(await strategy.netAssetValue())}`);
}

main()
