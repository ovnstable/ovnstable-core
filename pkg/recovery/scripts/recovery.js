const { verify } = require("@overnight-contracts/common/utils/verify-utils");
const { getContract, initWallet, getERC20ByAddress, impersonateAccount, isContract } = require("@overnight-contracts/common/utils/script-utils");
const { Roles } = require("@overnight-contracts/common/utils/roles");

const Pool = require('@overnight-contracts/pools/abi/ComposableStablePool.json');
const Vault = require('@overnight-contracts/pools/abi/VaultBalancer.json');
const BeetsGaugePool = require('@overnight-contracts/pools/abi/BeetsGaugeStablePool.json');
const UsdPlusToken = require('@overnight-contracts/core/deployments/optimism/UsdPlusToken.json')
const WrappedUsdPlusToken = require('@overnight-contracts/market/deployments/optimism/WrappedUsdPlusToken.json')
const WrappedDaiPlusToken = require('@overnight-contracts/market/deployments/optimism_dai/WrappedUsdPlusToken.json')
const VeloGaugePool = require('@overnight-contracts/pools/abi/VelodromeGauge.json');
const VeloPair = require('@overnight-contracts/pools/abi/VelodromePair.json');
const wrappedHolders = require("./wrappedHolders.json")
const beetsAddresses = require("./beetsAddresses.json")
const velodrome1 = require('./velodrome_0x67124355cCE2Ad7A8eA283E990612eBe12730175_0xd2d95775d35a6d492ced7c7e26817aacb7d264f2.json')
const velodrome2 = require('./velodrome_0x8a9Cd3dce710e90177B4332C108E159a15736A0F_0x1032950b49fc23316655e5d0cc066bcd85b28ec7.json')
const velodrome3 = require('./velodrome_0xa99817d2d286C894F8f3888096A5616d06F20d46_0x05d74f34ff651e80b0a1a4bd96d8867626ac2ddd.json')
const fs = require('fs');
const { ethers } = require("hardhat");
const { fromE18, fromE6 } = require("@overnight-contracts/common/utils/decimals");

async function main() {


    // const wallet = '0xe513de08500025e9a15e0cb54b232169e5c169bc' // has USD+/DAI+ in beets pools
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
    // await getBeetsBalances(80668149, 80735354)
    await getBalancesVelodromeGauges()
    // await getBalanceVelodromeGauge(wallet, 92686688)
    // const gaugePool = await ethers.getContractAt(BeetsGaugePool, "0xa066243Ba7DAd6C779caA1f9417910a4AE83cf4D");
    // await getHolders(gaugePool, 80668149)

    // await getContractSize("0xBA12222222228d8Ba445958a75a0704d566BF2C8");
    // await getBalance()

    // const usdpAddress = "0x73cb180bf0521828d8849bc8CF2B920918e23032"
    // const usdPlus = await ethers.getContract("UsdPlus");

    // const usdpToken = await ethers.getContractAt(UsdPlusToken.abi, "0x73cb180bf0521828d8849bc8CF2B920918e23032");
    // const res = await getHoldersWithBalancesNonZero(usdpToken, 80668149)
    // await balanceAndConvertWrapped()
}

// 100 USDC -> 100 LP USDC/wUSD+
// 100 LP - 100 BPT
// 100 BPT - gauge

async function getBeetsBalances(blockNumber1, blockNumber2) {
    const map1 = [];
    for (const address of beetsAddresses) {
        const before = await getBalance(address, blockNumber1);
        const after = await getBalance(address, blockNumber1 + 1);
        if (before.amountLinearPoolDaiPlus != 0) {
            map1.push({
                "address": address,
                "gaugeBalance": before.gaugeBalance,
                "bptBalance": before.bptBalance,
                "beforeUsd+": before.amountLinearPoolUsdPlus,
                "afterUsd+": after.amountLinearPoolUsdPlus,
                "differenceUsd+": before.amountLinearPoolUsdPlus - after.amountLinearPoolUsdPlus,
                // "beforeDai+": before.amountLinearPoolDaiPlus,
                // "afterDai+": after.amountLinearPoolDaiPlus,
                // "differenceDai+": before.amountLinearPoolDaiPlus - after.amountLinearPoolDaiPlus,
            })
        }
    }
    fs.writeFileSync("beetsHoldersUsd+.json", JSON.stringify(map1, null, 4));
    const map2 = [];
    for (const address of beetsAddresses) {
        const before = await getBalance(address, blockNumber2);
        const after = await getBalance(address, blockNumber2 + 1);
        if (before.amountLinearPoolDaiPlus != 0) {
            map2.push({
                "address": address,
                "gaugeBalance": before.gaugeBalance,
                "bptBalance": before.bptBalance,
                // "beforeUsd+": before.amountLinearPoolUsdPlus,
                // "afterUsd+": after.amountLinearPoolUsdPlus,
                // "differenceUsd+": before.amountLinearPoolUsdPlus - after.amountLinearPoolUsdPlus,
                "beforeDai+": before.amountLinearPoolDaiPlus,
                "afterDai+": after.amountLinearPoolDaiPlus,
                "differenceDai+": before.amountLinearPoolDaiPlus - after.amountLinearPoolDaiPlus,
            })
        }
    }
    fs.writeFileSync("beetsHoldersDai+.json", JSON.stringify(map2, null, 4));
}

async function balanceAndConvertWrapped() {
    const wrappedContract = await ethers.getContractAt(WrappedDaiPlusToken.abi, "0x0b8f31480249cc717081928b8af733f45f6915bb");
    // const wrappedHoldersAddresses = wrappedHolders.holders;
    const wrappedHoldersAddresses = ["0xba12222222228d8ba445958a75a0704d566bf2c8", "0x5cb01385d3097b6a189d1ac8ba3364d900666445"]
    const table = []
    for (const holder of wrappedHoldersAddresses) {
        const wrappedAmount = await wrappedContract.balanceOf(holder, { blockTag: 80735354 })
        const resBefore = await convertWrapped(wrappedAmount, 80735354, wrappedContract)
        const resAfter = await convertWrapped(wrappedAmount, 80735355, wrappedContract)
        table.push({ "address": holder, "wrappedAmount": fromE18(wrappedAmount), "amountBeforeRebase": fromE18(resBefore), "amountAfterRebase": fromE18(resAfter), "difference": fromE18(resBefore - resAfter) })
    }
    console.table(table)

}

async function getBalance(wallet, blockNumber) {
    const bptAmount = await getBalanceBeets(wallet, blockNumber);
    return await convertBptToLinearPoolsBeets(bptAmount, blockNumber);
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

    return { beetsBalance, gaugeBalance, bptBalance };
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

    const usdAmountBeforeRate = amountBpt.beetsBalance * poolTokens[1][0] / totalActualSupply;
    const daiAmountBeforeRate = amountBpt.beetsBalance * poolTokens[1][2] / totalActualSupply;

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

    return { amountLinearPoolUsdPlus, amountLinearPoolDaiPlus, gaugeBalance: amountBpt.gaugeBalance, bptBalance: amountBpt.bptBalance };


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

async function getBalancesVelodromeGauges() {
    const velodromeList = []
    for (const address of velodrome1) {
        const resultBefore = await getBalanceVelodromeGauge(address, 80668149, "0x67124355cCE2Ad7A8eA283E990612eBe12730175", "0xd2d95775d35a6d492ced7c7e26817aacb7d264f2")
        const resultAfter = await getBalanceVelodromeGauge(address, 80668150, "0x67124355cCE2Ad7A8eA283E990612eBe12730175", "0xd2d95775d35a6d492ced7c7e26817aacb7d264f2")
        if (resultBefore.lpTokenBalance != 0) {
            velodromeList.push({
                "address": address,
                "pair": "StableV1 AMM - USD+/USDC",
                "lpTokenBalance": resultBefore.lpTokenBalance,
                "usdpBalanceBefore": resultBefore.usdpBalance,
                "usdpBalanceAfter": resultAfter.usdpBalance,
                "difference": resultBefore.usdpBalance - resultAfter.usdpBalance,
            })
            console.log(resultBefore.usdpBalance - resultAfter.usdpBalance)
        }

    }
    for (const address of velodrome2) {
        // 0x8a9Cd3dce710e90177B4332C108E159a15736A0F 0x1032950b49fc23316655e5d0cc066bcd85b28ec7
        const resultBefore = await getBalanceVelodromeGauge(address, 80668149, "0x8a9Cd3dce710e90177B4332C108E159a15736A0F", "0x1032950b49fc23316655e5d0cc066bcd85b28ec7")
        const resultAfter = await getBalanceVelodromeGauge(address, 80668150, "0x8a9Cd3dce710e90177B4332C108E159a15736A0F", "0x1032950b49fc23316655e5d0cc066bcd85b28ec7")
        if (resultBefore.lpTokenBalance != 0) {
            velodromeList.push({
                "address": address,
                "pair": "StableV1 AMM - USD+/LUSD",
                "lpTokenBalance": resultBefore.lpTokenBalance,
                "usdpBalanceBefore": resultBefore.usdpBalance,
                "usdpBalanceAfter": resultAfter.usdpBalance,
                "difference": resultBefore.usdpBalance - resultAfter.usdpBalance,
            })
            console.log(resultBefore.usdpBalance - resultAfter.usdpBalance)
        }
    }
    for (const address of velodrome3) {
        // 0xa99817d2d286C894F8f3888096A5616d06F20d46 0x05d74f34ff651e80b0a1a4bd96d8867626ac2ddd
        const resultBefore = await getBalanceVelodromeGauge(address, 80668149, "0xa99817d2d286C894F8f3888096A5616d06F20d46", "0x05d74f34ff651e80b0a1a4bd96d8867626ac2ddd")
        const resultAfter = await getBalanceVelodromeGauge(address, 80668150, "0xa99817d2d286C894F8f3888096A5616d06F20d46", "0x05d74f34ff651e80b0a1a4bd96d8867626ac2ddd")
        if (resultBefore.lpTokenBalance != 0) {
            velodromeList.push({
                "address": address,
                "pair": "StableV1 AMM - USD+/DOLA",
                "lpTokenBalance": resultBefore.lpTokenBalance,
                "usdpBalanceBefore": resultBefore.usdpBalance,
                "usdpBalanceAfter": resultAfter.usdpBalance,
                "difference": resultBefore.usdpBalance - resultAfter.usdpBalance,
            })
            console.log(resultBefore.usdpBalance - resultAfter.usdpBalance)
        }
    }
    fs.writeFileSync("velodromeUsdp.json", JSON.stringify(velodromeList, null, 4));

}

async function getBalanceVelodromeGauge(wallet, blockNumber, pairAddress, gaugeAddress) {
    const pair = await ethers.getContractAt(VeloPair, pairAddress);
    const gauge = await ethers.getContractAt(VeloGaugePool, gaugeAddress);
    // 0x67124355cce2ad7a8ea283e990612ebe12730175
    const lpTokenBalance = await gauge.balanceOf(wallet, { blockTag: blockNumber });
    const totalLpBalance = await pair.totalSupply({ blockTag: blockNumber });
    const reserves = await pair.getReserves({ blockTag: blockNumber });
    const token0 = await pair.token0({})
    const reserveBalance = token0 === "0x73cb180bf0521828d8849bc8CF2B920918e23032" ? reserves._reserve0 : reserves._reserve1;

    const token1 = await pair.token1({})
    if (token1 !== "0x73cb180bf0521828d8849bc8CF2B920918e23032" && token0 !== "0x73cb180bf0521828d8849bc8CF2B920918e23032") {
        console.log("strange", pairAddress)
    }
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
    return { usdpBalance: fromE6(usdpBalance), lpTokenBalance: fromE6(lpTokenBalance) };

}

async function getContractSize(contractAddress) {
    const bytecode = await ethers.provider.getCode(contractAddress);
    const size = bytecode.length / 2;
    console.log(`Contract size: ${size} bytes`);
    // console.log(bytecode)
}





main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
