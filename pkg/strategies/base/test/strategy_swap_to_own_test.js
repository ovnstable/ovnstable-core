// const { fromE18, toE18, fromAsset, fromE6, toAsset } = require("./decimals");
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

    const strategy = await getContract('StrategySwapToOvn');

    // // let pendleDaiUsdt = await getContract('StrategyPendleDaiUsdt', 'arbitrum_dai');
    // let testWallet = await createRandomWallet();
    let ovnToken = await getCoreAsset("base_ovn");
    let usdPlusToken = await getERC20("usdPlus");


    //await strategy.setPortfolioManager(wallet.address);

    console.log("my tokens:")
    await printTokenBalance(ovnToken, wallet.address);
    await printTokenBalance(usdPlusToken, wallet.address);

    await usdPlusToken.transfer(strategy.address, 500000);

    console.log("\n", "strategy:")
    await printTokenBalance(ovnToken, strategy.address);
    await printTokenBalance(usdPlusToken, strategy.address);
    console.log(`NAV: ${formatOvn(await strategy.netAssetValue())}`);

    console.log("\n", "setting params...");
    let someAddress = "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266";
    // set current wallet as PM
    await strategy.setStrategyParams(wallet.address, "0xA5096260710D135F9C3762FcD07B6b2E2Fd127D1");

    console.log("\n", "claiming rewards...");
    await (await strategy.claimRewards(someAddress)).wait();
    
    console.log("Balance of PM after claim:");
    await printTokenBalance(ovnToken, someAddress);
}

main()
