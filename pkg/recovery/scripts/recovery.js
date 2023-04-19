const { verify } = require("@overnight-contracts/common/utils/verify-utils");
const { getContract, initWallet, getERC20ByAddress, impersonateAccount } = require("@overnight-contracts/common/utils/script-utils");
const { Roles } = require("@overnight-contracts/common/utils/roles");

let Pool = require('@overnight-contracts/pools/abi/ComposableStablePool.json');
let GaugePool = require('@overnight-contracts/pools/abi/GaugeStablePool.json');
const { ethers } = require("hardhat");
const { fromE18 } = require("@overnight-contracts/common/utils/decimals");

async function main() {


    let wallet = '0x98a513e3caf92d9a402caed7b470f58e3e061c84' // has USD+/DAI+ in beets pools

    // await getContract()


    // Boosted Pool - Overnight Pulse
    // - linear pool USDC/wUSD+
    // - linear pool DAI/wDAI+

    // Linear pool USDC/wUSD+
    // - USDC
    // - wUSD+

    // Linear pool DAI/wDAI+
    // - USDC
    // - wUSD+

    // LP Boosted pool stake in Gauge

    // wUSD+ | wDAI+
    // - USD+
    // - DAI+

    // 100 usdc -> Хочу положить в овернайт пул ->

    await getBalance(wallet, 92134340);

}

// 100 USDC -> 100 LP USDC/wUSD+
// 100 LP - 100 BPT
// 100 BPT - gauge

async function getBalance(wallet, blockNumber) {
    console.log(await getBalanceBeets(wallet, blockNumber))
}

async function getBalanceBeets(wallet, blockNumber) {
    const gaugeBalance = await getBalanceBeetsGauge(wallet, blockNumber);
    const bptBalance = await getBptBalance(wallet, blockNumber);
    const beetsBalance = gaugeBalance + bptBalance;

    console.table([
        {
            name: 'Gauge',
            amount: gaugeBalance
        },
        {
            name: 'BPT',
            amount: bptBalance
        }
    ])

    return beetsBalance;
}

async function convertBptToLinearPools(amountBpt){

    let amountLinearPoolUsdPlus;
    let amountLinearPoolDaiPlus;

}

async function convertLinearPoolToAssets(amountLp){

    let amountUnderlying;
    let amountWrapped;
}

async function getBalanceBeetsGauge(wallet, blockNumber) {
    const gaugePool = await ethers.getContractAt(GaugePool, "0xa066243Ba7DAd6C779caA1f9417910a4AE83cf4D", wallet);
    const gaugeBalance = fromE18(await gaugePool.balanceOf(wallet, { blockTag: blockNumber }))
    return gaugeBalance;
}


async function getBptBalance(wallet, blockNumber) {
    const bptPool = await ethers.getContractAt(Pool, "0xb1C9aC57594e9B1EC0f3787D9f6744EF4CB0A024", wallet);
    const bptBalance = fromE18(await bptPool.balanceOf(wallet, { blockTag: blockNumber }))
    return bptBalance;
}


main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });

