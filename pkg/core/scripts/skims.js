const {
    getContract,
    showM2M,
    showRewardsFromPayout, execTimelock, findEvent, showPoolOperationsFromPayout, showPayoutEvent, transferETH,
    getWalletAddress, showProfitOnRewardWallet, getPrice
} = require("@overnight-contracts/common/utils/script-utils");
const {fromE6, fromAsset, fromUsdPlus} = require("@overnight-contracts/common/utils/decimals");
const {COMMON, ARBITRUM} = require("@overnight-contracts/common/utils/assets");
const {ethers} = require("hardhat");
const {getOdosSwapData, getOdosAmountOut, getEmptyOdosData} = require("@overnight-contracts/common/utils/odos-helper");
const {Roles} = require("@overnight-contracts/common/utils/roles");
const hre = require('hardhat'); 
async function main() {

    let payout = await getContract('ArbitrumPayoutManager');

    console.table((await payout.getItems()).map(({poolName, operation, dexName, token})=>{return {poolName, operation, dexName, token:tokenName(token)}}));

}
  
const tokenName =(addr) => {
    const found= Object.entries(ARBITRUM).find(([key, val]) => val == addr)
    return found ? found[0]: addr;
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });

