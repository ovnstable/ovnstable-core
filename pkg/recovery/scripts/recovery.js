const { verify } = require("@overnight-contracts/common/utils/verify-utils");
const { getContract, initWallet, getERC20ByAddress, impersonateAccount } = require("@overnight-contracts/common/utils/script-utils");
const { Roles } = require("@overnight-contracts/common/utils/roles");

const Pool = require('@overnight-contracts/pools/abi/ComposableStablePool.json');
const Vault = require('@overnight-contracts/pools/abi/VaultBalancer.json');
const GaugePool = require('@overnight-contracts/pools/abi/GaugeStablePool.json');
const { ethers } = require("hardhat");
const { fromE18 } = require("@overnight-contracts/common/utils/decimals");

async function main() {


    const wallet = '0x98a513e3caf92d9a402caed7b470f58e3e061c84' // has USD+/DAI+ in beets pools

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

    await getBalance(wallet, 80668150);

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

async function convertBptToLinearPools(amountBpt) {

    // const amountLinearPoolUsdPlus;
    // const amountLinearPoolDaiPlus;
    const vault = await ethers.getContractAt(Vault, "0xBA12222222228d8Ba445958a75a0704d566BF2C8");

    // const balances = await vault.getPoolTokens(poolId);
    const poolTokens = await vault.getPoolTokens("wallet", { blockTag: blockNumber });
    console.log("poolTokens:", poolTokens);


    const bptPool = await ethers.getContractAt(Pool, "0xb1C9aC57594e9B1EC0f3787D9f6744EF4CB0A024");
    const totalActualSupply = fromE18(await bptPool.getActualSupply({ blockTag: blockNumber }));
    const usdPool = await ethers.getContractAt(Pool, '0x88D07558470484c03d3bb44c3ECc36CAfCF43253');
    const poolRate = await usdPool.getRate();

    const amount = amountBpt * poolTokens[0][1] / totalActualSupply;
    console.log("amount", amount);

    const amountToken = amount * poolRate;
    console.log("amountToken", amountToken);

    return amountToken;






    // uint256 totalActualSupply = bpt.getActualSupply();

    // // How it work?
    // // 1. Calculating share (bb-USDC,bb-DAI,bb-USDT)
    // // 2. Convert bb-* tokens to underlying tokens (DAI,USDC,USDT)
    // // 3. Convert tokens (DAI,USDT) to USDC through chainlink oracle

    //     uint256 amountToken = balances[i] * bptAmount / totalActualSupply;
    //         // bpt token convert to underlying tokens by Rate
    //         // e18 + e18 - e30 = e6
    //         amountToken = amountToken * bbaUsdc.getRate() / 1e30;
    //         totalBalanceUsdc += amountToken;

    // get pool tokens of 0xba 0xedcfaf390906a8f91fb35b7bac23f3111dbaee1c00000000000000000000007c
    // 67662713208 amount balances[i]
    // bptAmount =
    // getActualSupply 0xb1C9aC57594e9B1EC0f3787D9f6744EF4CB0A024 bpt-usd+
    // amount = 67662713208* bptAmount / getActualSupply
    // bbaUsdcGetRate = 0x88D07558470484c03d3bb44c3ECc36CAfCF43253
    // amountToken = amount * bbaUsdcGetRate/1e30






}

async function convertLinearPoolToAssets(amountLp) {

    let amountUnderlying;
    let amountWrapped;
}

async function getBalanceBeetsGauge(wallet, blockNumber) {
    const gaugePool = await ethers.getContractAt(GaugePool, "0xa066243Ba7DAd6C779caA1f9417910a4AE83cf4D");
    const gaugeBalance = fromE18(await gaugePool.balanceOf(wallet, { blockTag: blockNumber }))
    return gaugeBalance;
}


async function getBptBalance(wallet, blockNumber) {
    const bptPool = await ethers.getContractAt(Pool, "0xb1C9aC57594e9B1EC0f3787D9f6744EF4CB0A024");
    const bptBalance = fromE18(await bptPool.balanceOf(wallet, { blockTag: blockNumber }))
    return bptBalance;
}


main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });

