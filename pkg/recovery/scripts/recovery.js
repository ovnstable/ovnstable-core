const { verify } = require("@overnight-contracts/common/utils/verify-utils");
const { getContract, initWallet, getERC20ByAddress, impersonateAccount } = require("@overnight-contracts/common/utils/script-utils");
const { Roles } = require("@overnight-contracts/common/utils/roles");

const Pool = require('@overnight-contracts/pools/abi/ComposableStablePool.json');
const Vault = require('@overnight-contracts/pools/abi/VaultBalancer.json');
const BeetsGaugePool = require('@overnight-contracts/pools/abi/BeetsGaugeStablePool.json');
const VeloGaugePool = require('@overnight-contracts/pools/abi/VelodromeGauge.json');
const VeloPair = require('@overnight-contracts/pools/abi/VelodromePair.json');
const { ethers } = require("hardhat");
const { fromE18, fromE6 } = require("@overnight-contracts/common/utils/decimals");

async function main() {


    const wallet = '0xe513de08500025e9a15e0cb54b232169e5c169bc' // has USD+/DAI+ in beets pools
    // 0x98a513e3caf92d9a402caed7b470f58e3e061c84 for beets check
    // 0xdc233910a2f71d2734a8cad1ca2d936df805bb62 for usdc/usd+ velodrome

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

    // await getBalance(wallet, 80668149);
    // await getBalance(wallet, 80668150);
    await getBalanceVelodromeGauge(wallet, 92686688)
    // await getBalance()

}

// 100 USDC -> 100 LP USDC/wUSD+
// 100 LP - 100 BPT
// 100 BPT - gauge

async function getBalance(wallet, blockNumber) {
    const bptAmount = await getBalanceBeets(wallet, blockNumber)
    const res = await convertBptToLinearPoolsBeets(bptAmount, blockNumber)
}

async function getBalanceBeets(wallet, blockNumber) {
    const gaugeBalance = await getBalanceBeetsGauge(wallet, blockNumber);
    const bptBalance = await getBptBalance(wallet, blockNumber);
    const beetsBalance = gaugeBalance + bptBalance;

    // console.table([
    //     {
    //         name: 'Gauge',
    //         amount: gaugeBalance
    //     },
    //     {
    //         name: 'BPT',
    //         amount: bptBalance
    //     }
    // ])

    return beetsBalance;
}

async function convertBptToLinearPoolsBeets(amountBpt, blockNumber) {

    const vault = await ethers.getContractAt(Vault, "0xBA12222222228d8Ba445958a75a0704d566BF2C8");
    let pool = await ethers.getContractAt(Pool, '0xb1C9aC57594e9B1EC0f3787D9f6744EF4CB0A024');
    const poolTokens = await vault.getPoolTokens(await pool.getPoolId(), { blockTag: blockNumber });
    const bptPool = await ethers.getContractAt(Pool, "0xb1C9aC57594e9B1EC0f3787D9f6744EF4CB0A024");
    const totalActualSupply = await bptPool.getActualSupply({ blockTag: blockNumber });
    const usdPool = await ethers.getContractAt(Pool, '0x88D07558470484c03d3bb44c3ECc36CAfCF43253');
    const daiPool = await ethers.getContractAt(Pool, '0xb5ad7d6d6F92a77F47f98C28C84893FBccc94809');
    const usdPoolRate = fromE18(await usdPool.getRate({ blockTag: blockNumber }));
    const daiPoolRate = fromE18(await daiPool.getRate({ blockTag: blockNumber }));

    const usdAmountBeforeRate = amountBpt * poolTokens[1][0] / totalActualSupply;
    const daiAmountBeforeRate = amountBpt * poolTokens[1][2] / totalActualSupply;

    const amountLinearPoolUsdPlus = usdAmountBeforeRate * usdPoolRate;
    const amountLinearPoolDaiPlus = daiAmountBeforeRate * daiPoolRate;
    console.table([
        {
            name: 'amountLinearPoolUsdPlus',
            amount: amountLinearPoolUsdPlus
        },
        {
            name: 'amountLinearPoolDaiPlus',
            amount: amountLinearPoolDaiPlus
        }
    ])

    return amountLinearPoolUsdPlus, amountLinearPoolDaiPlus;


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



// async function convertLinearPoolToAssets(amountLp) {

//     let amountUnderlying;
//     let amountWrapped;
// }

async function getBalanceBeetsGauge(wallet, blockNumber) {
    const gaugePool = await ethers.getContractAt(BeetsGaugePool, "0xa066243Ba7DAd6C779caA1f9417910a4AE83cf4D");
    const gaugeBalance = fromE18(await gaugePool.balanceOf(wallet, { blockTag: blockNumber }))
    return gaugeBalance;
}


async function getBptBalance(wallet, blockNumber) {
    const bptPool = await ethers.getContractAt(Pool, "0xb1C9aC57594e9B1EC0f3787D9f6744EF4CB0A024");
    const bptBalance = fromE18(await bptPool.balanceOf(wallet, { blockTag: blockNumber }))
    return bptBalance;
}

async function convertWrapped(wrappedAmount, blockNumber, contract) {

    // wrappedUsdPlus = await ethers.getContract("WrappedUsdPlusToken");

    const unwrappedAmount = await contract.convertToAssets(wrappedAmount, { blockTag: blockNumber });
    return unwrappedAmount;
}

async function getBalanceVelodromeGauge(wallet, blockNumber) {
    const pair = await ethers.getContractAt(VeloPair, "0x67124355cce2ad7a8ea283e990612ebe12730175");
    const gauge = await ethers.getContractAt(VeloGaugePool, "0xd2d95775D35A6D492CED7C7e26817aAcB7D264F2"); // ????
    // 0x67124355cce2ad7a8ea283e990612ebe12730175
    const lpTokenBalance = await gauge.balanceOf(wallet, { blockTag: blockNumber });
    const totalLpBalance = await pair.totalSupply({ blockTag: blockNumber });
    const reserves = await pair.getReserves({ blockTag: blockNumber });
    const token0 = await pair.token0({})
    const reserveBalance = token0 === "0x73cb180bf0521828d8849bc8CF2B920918e23032" ? reserves._reserve0 : reserves._reserve1;
    const usdpBalance = reserveBalance * lpTokenBalance / totalLpBalance;
    console.table([
        {
            name: 'reserveBalance',
            amount: fromE6(reserveBalance)
        },
        {
            name: 'lpTokenBalance',
            amount: fromE6(lpTokenBalance)
        },
        {
            name: 'totalLpBalance',
            amount: fromE6(totalLpBalance)
        },
        {
            name: 'usdpBalance',
            amount: fromE6(usdpBalance)
        }
    ])
    return usdpBalance;

}






main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });



    // usdc До , usdc после, разница
    // dai аналогично


    // из beets преобразовывать не нужно
// wusd+ -> usd+ 
// wdai+ -> dai+ 
// 