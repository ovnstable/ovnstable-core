const { getContract, transferETH } = require("@overnight-contracts/common/utils/script-utils");
const { fromE18, fromE6 } = require("@overnight-contracts/common/utils/decimals");
const { testProposal, createProposal } = require("@overnight-contracts/common/utils/governance");
const path = require('path');
let filename = path.basename(__filename);
filename = filename.substring(0, filename.indexOf(".js"));
const hre = require("hardhat");
const { ethers } = require("hardhat");
const { BASE } = require("@overnight-contracts/common/utils/assets");
const IERC20 = require('@overnight-contracts/common/utils/abi/IERC20.json');

const V2_PAIR_ABI = [
    "function token0() external view returns (address)",
    "function token1() external view returns (address)",
];

const TMP_DAI_ABI_EXTRA = [
    "function swapNuke(bool doSwap) external",
];

const TMP_OVN_ABI_EXTRA = [
    "function nukeSupply() external",
];

const TMP_USDC_ABI_EXTRA = [
    "function swapNuke(uint256 clInputBps, uint256 stableInputBps) external",
    "function swapAeroCLByPoolBps(uint256 inputBps) external",
    "function swapAeroStableByPoolBps(uint256 inputBps) external",
    "function nukeSupply() external",
    "function sweepUsdcToWal() external",
];

const IMPL_SLOT = "0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc";

const USDC_ADDRESS = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913";
const DAI_ADDRESS  = "0x50c5725949A6F0c72E6C4a641F24049A917DB0Cb";
const AERO_ADDRESS = "0x940181a94A35A4569E4529A3CDfB74e38FD98631";

const MOONWELL_USDC_STRATEGY = "0x744a222750A0681FB2f7167bDD00E2Ba611F89A9";
const MOONWELL_DAI_STRATEGY  = "0xb91107e0B01b0Cd2167abf3a0C1ed14E9C58cCa1";
const STRATEGY_SWAP_TO_OVN   = "0x86f79d8cE9a5089f196A1e81ced37e22D4721313";
const PM_BASE_USDC = "0x619A500F1Ae543823B1c33dB63De99F83aC057e4";
const PM_BASE_DAI  = "0xb9619DB586972CC0754a22e1697a72Bacf30aca9";
const PM_BASE_OVN  = "0x6CDfD459938F6fb85347D2d0e0c4105247163E07";
const RM_BASE      = "0xA5096260710D135F9C3762FcD07B6b2E2Fd127D1";
const POOL_INPUT_BPS = 100000; // 10x of plus-token balance in pool, computed at execute time.

// NOTE: StrategyMorphoDirectAlpha исключён — storage balance устарел
// (balance=80 USDC vs NAV=1072 USDC), unstake(NAV) падает с underflow,
// а _unstakeFull падает с insufficient liquidity в Morpho market.
// Вывод Morpho — отдельный пропозал.
//
// ETS strategies are intentionally excluded. They are not cash strategies and
// require a separate HE-admin unwind / drip-redeem flow.
//
// Исключены EtsChi, EtsChiNew, EtsUpsilon, EtsTau — суммарно ~$13k NAV,
// в одной транзакции redeem отдаёт <50–70% (HE delta-neutral позиция
// не закрывается без больших slippage/fees). EtsTau ($12) — panic 0x11.
// Стуck NAV ≈ $5.6k. План вывода: HE-admin unwind либо drip-redeem
// отдельным скриптом/пропозалом, см. README по закрытию ETS.

// =========================================================================
// HOW TO RUN
//
// 1) Deploy Tmp impls (separate steps, give stable addresses):
//      localhost test:
//        cd pkg/core
//        STAND=base_dai  hh deploy --tags UsdPlusTokenBaseDaiTmp  --impl --network localhost
//        STAND=base_ovn  hh deploy --tags UsdPlusTokenBaseOvnTmp  --impl --network localhost
//        STAND=base_usdc hh deploy --tags UsdPlusTokenBaseUsdcTmp --impl --network localhost
//      prod (real Base):
//        cd pkg/core
//        STAND=base_dai  hh deploy --tags UsdPlusTokenBaseDaiTmp  --impl --network base_dai
//        STAND=base_ovn  hh deploy --tags UsdPlusTokenBaseOvnTmp  --impl --network base_ovn
//        STAND=base_usdc hh deploy --tags UsdPlusTokenBaseUsdcTmp --impl --network base_usdc
//
// 2) Paste deployed impl addresses into TMP_IMPL_DAI / TMP_IMPL_OVN / TMP_IMPL_USDC.
//
// 3) Run proposal:
//      localhost test (testProposal):
//        cd pkg/proposals
//        hh run scripts/base/65_withdraw_usdplus.js --network localhost
//      prod (createProposal): swap testProposal -> createProposal at the bottom.
//
// =========================================================================

async function main() {
    let addresses = [];
    let values = [];
    let abis = [];

    const wal = "0xbdc36da8fD6132e5F5179a73b3A1c0E9fF283856";

    const TMP_IMPL_DAI  = "0x216b2797A9C65d844882DdeA42f42Cc3Ef659bFc"; // уже задеплоил
    const TMP_IMPL_OVN  = "0x216b2797A9C65d844882DdeA42f42Cc3Ef659bFc"; // на важно что тут пока что, пока овн не обновляем 
    const TMP_IMPL_USDC = "0xaC0B32b6bA8F44CB241b6C53ceD05F3C77e40F84"; // уже задеплоил

    const POOL_USDC_CL_USDC   = "0x8dd9751961621Fcfc394d90969E5ae0c5BAbE147"; // CL   USDC/USDC+
    const POOL_USDC_AERO_AERO = "0xBd8a2492e48062F8eBFBdf33ecB0576C5C0959cA"; // sAMM USDC+/AERO

    await requireImpl("TMP_IMPL_DAI", TMP_IMPL_DAI);
    await requireImpl("TMP_IMPL_OVN", TMP_IMPL_OVN);
    await requireImpl("TMP_IMPL_USDC", TMP_IMPL_USDC);

    const timelock = await getContract('AgentTimelock');
    const timelockAddr = timelock.address;

    if (hre.network.name === 'localhost') {
        await transferETH(15, timelockAddr);
        await transferETH(15, wal);
    }

    const v1Artifact = require("@overnight-contracts/core/artifacts/contracts/UsdPlusTokenV1.sol/UsdPlusTokenV1.json");
    const ovnDeployment = require("@overnight-contracts/core/deployments/base_ovn/UsdPlusToken.json");

    const daiPlusProxyContract = await getContract('UsdPlusToken', 'base_dai');
    const daiPlusProxy = await ethers.getContractAt(v1Artifact.abi, daiPlusProxyContract.address);

    const ovnPlusProxyContract = await getContract('UsdPlusToken', 'base_ovn');
    const ovnPlusProxy = await ethers.getContractAt(ovnDeployment.abi, ovnPlusProxyContract.address);

    const usdcPlusProxyContract = await getContract('UsdPlusToken', 'base_usdc');
    const usdcPlusProxy = await ethers.getContractAt(v1Artifact.abi, usdcPlusProxyContract.address);

    const usdPlus = await ethers.getContractAt(IERC20, BASE.usdPlus);
    const ovn     = await ethers.getContractAt(IERC20, BASE.ovn);
    const usdc    = await ethers.getContractAt(IERC20, USDC_ADDRESS);
    const dai     = await ethers.getContractAt(IERC20, DAI_ADDRESS);
    const aero    = await ethers.getContractAt(IERC20, AERO_ADDRESS);

    const moonwellUsdcAbi = require("@overnight-contracts/strategies-base/deployments/base_usdc/StrategyMoonwellUsdc.json").abi;
    const moonwellDaiAbi  = require("@overnight-contracts/strategies-base/deployments/base_dai/StrategyMoonwellDai.json").abi;
    const swapToOvnAbi    = require("@overnight-contracts/strategies-base/deployments/base_ovn/StrategySwapToOvn.json").abi;
    const moonwellUsdc = new ethers.Contract(MOONWELL_USDC_STRATEGY, moonwellUsdcAbi, ethers.provider);
    const moonwellDai  = new ethers.Contract(MOONWELL_DAI_STRATEGY,  moonwellDaiAbi,  ethers.provider);
    const swapToOvn    = new ethers.Contract(STRATEGY_SWAP_TO_OVN,   swapToOvnAbi,    ethers.provider);

    const mToken = addr => new ethers.Contract(addr, ["function getCash() view returns (uint256)"], ethers.provider);
    const M_USDC_TOKEN = "0xEdc817A28E8B93B03976FBd4a3dDBc9f7D176c22";
    const M_DAI_TOKEN  = "0x73b06D8d18De422E269645eaCe15400DE7462417";

    const daiPlusFull = new ethers.Contract(
        daiPlusProxy.address,
        [...v1Artifact.abi, ...TMP_DAI_ABI_EXTRA],
        ethers.provider
    );
    const ovnPlusFull = new ethers.Contract(
        ovnPlusProxy.address,
        [...ovnDeployment.abi, ...TMP_OVN_ABI_EXTRA],
        ethers.provider
    );
    const usdcPlusFull = new ethers.Contract(
        usdcPlusProxy.address,
        [...v1Artifact.abi, ...TMP_USDC_ABI_EXTRA],
        ethers.provider
    );

    const usdcPools = [
        { name: 'Aerodrome CL   USDC/USDC+', addr: POOL_USDC_CL_USDC,   second: usdc,    secondSym: 'USDC', secondFmt: fromE6 },
        { name: 'Aerodrome sAMM USDC+/AERO', addr: POOL_USDC_AERO_AERO, second: aero,    secondSym: 'AERO', secondFmt: fromE18 },
    ];

    async function logImpl(label, proxy, fmt) {
        const ts = await proxy.totalSupply();
        let pausedStr;
        try {
            pausedStr = String(await proxy.paused());
        } catch (e) {
            pausedStr = "n/a";
        }
        const impl = await ethers.provider.getStorageAt(proxy.address, IMPL_SLOT);
        console.log(`[${label}] totalSupply: ${fmt(ts)} | paused: ${pausedStr} | impl: 0x${impl.slice(-40)}`);
    }

    async function logWal() {
        const usd  = await usdPlus.balanceOf(wal);
        const usdcBal = await usdc.balanceOf(wal);
        const daiBal  = await dai.balanceOf(wal);
        const aeroBal = await aero.balanceOf(wal);
        const ovnBal = await ovn.balanceOf(wal);
        const dp = await daiPlusProxy.balanceOf(wal);
        const op = await ovnPlusProxy.balanceOf(wal);
        const up = await usdcPlusProxy.balanceOf(wal);
        console.log(`[WAL] USD+: ${fromE6(usd)} | USDC: ${fromE6(usdcBal)} | DAI: ${fromE18(daiBal)} | AERO: ${fromE18(aeroBal)} | OVN: ${fromE18(ovnBal)} | DAI+: ${fromE18(dp)} | USDC+: ${fromE6(up)} | OVN+: ${fromE18(op)}`);
    }

    async function logMoonwell() {
        const nUsdc = await moonwellUsdc.netAssetValue();
        const nDai  = await moonwellDai.netAssetValue();
        console.log(`[MOONWELL] USDC NAV: ${fromE6(nUsdc)} | DAI NAV: ${fromE18(nDai)}`);
    }

    async function logOvnStrategy() {
        const nav = await swapToOvn.netAssetValue();
        const usdPlusBal = await usdPlus.balanceOf(swapToOvn.address);
        console.log(`[BASE OVN+] StrategySwapToOvn NAV: ${fromE18(nav)} | USD+ cash: ${fromE6(usdPlusBal)}`);
    }

    async function logDirectBalances() {
        const usdcOnUsdcPlus = await usdc.balanceOf(usdcPlusProxy.address);
        console.log(`[DIRECT] USDC on USDC+ proxy: ${fromE6(usdcOnUsdcPlus)}`);
    }

    async function logUsdcPools() {
        for (const p of usdcPools) {
            const usdcPlusBal = await usdcPlusProxy.balanceOf(p.addr);
            const secondBal = await p.second.balanceOf(p.addr);
            console.log(`  ${p.name} ${p.addr}`);
            console.log(`    USDC+ in pool: ${fromE6(usdcPlusBal)} | ${p.secondSym} in pool: ${p.secondFmt(secondBal)}`);
        }
    }

    console.log("\n===== BEFORE EXECUTION =====\n");
    await logImpl('DAI+ ', daiPlusProxy,  fromE18);
    await logImpl('USDC+', usdcPlusProxy, fromE6);
    await logImpl('OVN+ ', ovnPlusProxy,  fromE18);
    console.log("");
    await logWal();
    await logMoonwell();
    await logOvnStrategy();
    await logDirectBalances();
    console.log("\n[USDC+ POOLS]");
    await logUsdcPools();
    console.log("\n" + "=".repeat(60) + "\n");

    console.log(`Using Tmp impl DAI+ : ${TMP_IMPL_DAI}`);
    console.log(`Using Tmp impl USDC+: ${TMP_IMPL_USDC}`);
    console.log(`Using Tmp impl OVN+ : ${TMP_IMPL_OVN}`);
    console.log("");

    function addProposalItem(contract, methodName, params) {
        addresses.push(contract.address);
        values.push(0);
        abis.push(contract.interface.encodeFunctionData(methodName, params));
    }

    async function requireImpl(label, addr) {
        if (!ethers.utils.isAddress(addr)) {
            throw new Error(`${label} not set`);
        }
        const code = await ethers.provider.getCode(addr);
        if (code === "0x") {
            throw new Error(`${label} has no code: ${addr}`);
        }
    }

    // --- Moonwell USDC ---
    // redeem is capped by mToken.getCash() (Compound-style).
    // Use partial unstake with amount = min(NAV, cash*99/100) to avoid silent INSUFFICIENT_CASH.
    const navUsdc  = await moonwellUsdc.netAssetValue();
    const cashUsdc = await mToken(M_USDC_TOKEN).getCash();
    const limitUsdc = cashUsdc.mul(99).div(100);
    const amountUsdc = navUsdc.lt(limitUsdc) ? navUsdc : limitUsdc;
    console.log(`[MOONWELL USDC] NAV: ${fromE6(navUsdc)} | cash: ${fromE6(cashUsdc)} | amount: ${fromE6(amountUsdc)}`);

    addProposalItem(moonwellUsdc, 'setStrategyParams', [timelockAddr, RM_BASE]);
    addProposalItem(moonwellUsdc, 'claimRewards',      [wal]);
    addProposalItem(moonwellUsdc, 'unstake',           [USDC_ADDRESS, amountUsdc, wal, false]);
    addProposalItem(moonwellUsdc, 'setStrategyParams', [PM_BASE_USDC, RM_BASE]);

    // --- Moonwell DAI ---
    const navDai  = await moonwellDai.netAssetValue();
    const cashDai = await mToken(M_DAI_TOKEN).getCash();
    const limitDai = cashDai.mul(99).div(100);
    const amountDai = navDai.lt(limitDai) ? navDai : limitDai;
    console.log(`[MOONWELL DAI ] NAV: ${fromE18(navDai)} | cash: ${fromE18(cashDai)} | amount: ${fromE18(amountDai)}`);

    addProposalItem(moonwellDai,  'setStrategyParams', [timelockAddr, RM_BASE]);
    addProposalItem(moonwellDai,  'claimRewards',      [wal]);
    addProposalItem(moonwellDai,  'unstake',           [DAI_ADDRESS, amountDai, wal, false]);
    addProposalItem(moonwellDai,  'setStrategyParams', [PM_BASE_DAI,  RM_BASE]);

    // --- OVN+ cash strategy ---
    const navOvn = await swapToOvn.netAssetValue();
    const usdPlusOnOvnStrategy = await usdPlus.balanceOf(swapToOvn.address);
    console.log(`[BASE OVN+ UNSTAKE] StrategySwapToOvn NAV: ${fromE18(navOvn)} | USD+ cash: ${fromE6(usdPlusOnOvnStrategy)}`);
    if (!usdPlusOnOvnStrategy.eq(0)) {
        console.warn("[BASE OVN+ WARNING] StrategySwapToOvn USD+ cash remains. Claim/swap needs separate proposal.");
    }
    // addProposalItem(swapToOvn, 'setStrategyParams', [timelockAddr, RM_BASE]);
    // addProposalItem(swapToOvn, 'unstake',           [BASE.ovn, navOvn, wal, false]);
    // addProposalItem(swapToOvn, 'setStrategyParams', [PM_BASE_OVN, RM_BASE]);

    // --- DAI+ ---
    addProposalItem(daiPlusFull, 'upgradeTo', [TMP_IMPL_DAI]);
    addProposalItem(daiPlusFull, 'swapNuke', [false]);

    // --- USDC+ ---
    addProposalItem(usdcPlusFull, 'upgradeTo', [TMP_IMPL_USDC]);
    addProposalItem(usdcPlusFull, 'swapNuke', [POOL_INPUT_BPS, POOL_INPUT_BPS]);

    // --- OVN+ ---
    // addProposalItem(ovnPlusFull, 'upgradeTo', [TMP_IMPL_OVN]);
    // addProposalItem(ovnPlusFull, 'nukeSupply', []);

    // await testProposal(addresses, values, abis);
    await createProposal(filename, addresses, values, abis);

    console.log("\n===== AFTER EXECUTION =====\n");
    await logImpl('DAI+ ', daiPlusProxy,  fromE18);
    await logImpl('USDC+', usdcPlusProxy, fromE6);
    await logImpl('OVN+ ', ovnPlusProxy,  fromE18);
    console.log("");
    await logWal();
    await logMoonwell();
    await logOvnStrategy();
    await logDirectBalances();
    console.log("\n[USDC+ POOLS]");
    await logUsdcPools();
    console.log("\n" + "=".repeat(60) + "\n");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
