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
    "function swapNuke(bool doSwap) external",
];

const IMPL_SLOT = "0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc";

const USDC_ADDRESS = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913";
const AERO_ADDRESS = "0x940181a94A35A4569E4529A3CDfB74e38FD98631";

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
// Note: hardhat node from a clean fork gives deterministic deploy addresses,
// so TMP_IMPL_* values stay the same across node restarts as long as deployer
// nonce sequence is identical.
// =========================================================================

async function main() {
    let addresses = [];
    let values = [];
    let abis = [];

    const wal = "0xbdc36da8fD6132e5F5179a73b3A1c0E9fF283856";

    const TMP_IMPL_DAI  = "0x80F9D708E50af42Aada27827193fD114F64C7c23";
    const TMP_IMPL_OVN  = "0xDf6c353bc41C3Ea7820B39ac9ABb18841F1C57F9";
    const TMP_IMPL_USDC = "0x710eb94d03c949B8794E098c057A684f1b8B5AA6";

    const DAI_PLUS_OLD_IMPL  = "0x1F7e713B77dcE6b2Df41Bb2Bb0D44cA35D795ed8"; // V1 last_visible_impl
    const OVN_PLUS_OLD_IMPL  = "0x4756f94A0b52EF481072bBE99A682A1B7e103770"; // current = last_visible_impl (SAME)
    const USDC_PLUS_OLD_IMPL = "0x1F7e713B77dcE6b2Df41Bb2Bb0D44cA35D795ed8"; // V1 last_visible_impl (same as DAI+)

    const POOL_DAI_SWAPBASED = "0x164Bc404c64FA426882D98dBcE9B10d5df656EeD";
    const POOL_DAI_ALIENBASE = "0xd97a40434627D5c897790DE9a3d2E577Cba5F2E0";
    const POOL_DAI_BASESWAP  = "0x7Fb35b3967798cE8322cC50eF52553BC5Ee4c306";
    const POOL_DAI_AERODROME = "0x1b05e4e814b3431a48b8164c41eaC834d9cE2Da6";

    const POOL_USDC_AERO_USDP = "0xE96c788E66a97Cf455f46C5b27786191fD3bC50B"; // sAMM USDC+/USD+
    const POOL_USDC_V2_USDP   = "0xc3cb7E40b78427078E2cb0c5dA0BF7A0650F89f8"; // V2   USDC+/USD+
    const POOL_USDC_CL_USDC   = "0x8dd9751961621Fcfc394d90969E5ae0c5BAbE147"; // CL   USDC/USDC+
    const POOL_USDC_AERO_AERO = "0xBd8a2492e48062F8eBFBdf33ecB0576C5C0959cA"; // sAMM USDC+/AERO

    if (!ethers.utils.isAddress(TMP_IMPL_DAI)) {
        throw new Error("TMP_IMPL_DAI is empty. Deploy UsdPlusToken_BaseDai_Tmp first and paste its address.");
    }
    if (!ethers.utils.isAddress(TMP_IMPL_OVN)) {
        throw new Error("TMP_IMPL_OVN is empty. Deploy UsdPlusToken_BaseOvn_Tmp first and paste its address.");
    }
    if (!ethers.utils.isAddress(TMP_IMPL_USDC)) {
        throw new Error("TMP_IMPL_USDC is empty. Deploy UsdPlusToken_BaseUsdc_Tmp first and paste its address.");
    }

    if (hre.network.name === 'localhost') {
        const timelock = await getContract('AgentTimelock');
        await transferETH(15, timelock.address);
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
    const usdc    = await ethers.getContractAt(IERC20, USDC_ADDRESS);
    const aero    = await ethers.getContractAt(IERC20, AERO_ADDRESS);

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

    const daiPools = [
        { name: 'SwapBased     ', addr: POOL_DAI_SWAPBASED },
        { name: 'AlienBase     ', addr: POOL_DAI_ALIENBASE },
        { name: 'BaseSwap      ', addr: POOL_DAI_BASESWAP  },
        { name: 'Aerodrome sAMM', addr: POOL_DAI_AERODROME },
    ];

    const usdcPools = [
        { name: 'Aerodrome sAMM USDC+/USD+', addr: POOL_USDC_AERO_USDP, second: usdPlus, secondSym: 'USD+', secondFmt: fromE6 },
        { name: 'UniswapV2-like USDC+/USD+', addr: POOL_USDC_V2_USDP,   second: usdPlus, secondSym: 'USD+', secondFmt: fromE6 },
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
        const aeroBal = await aero.balanceOf(wal);
        const dp = await daiPlusProxy.balanceOf(wal);
        const op = await ovnPlusProxy.balanceOf(wal);
        const up = await usdcPlusProxy.balanceOf(wal);
        console.log(`[WAL] USD+: ${fromE6(usd)} | USDC: ${fromE6(usdcBal)} | AERO: ${fromE18(aeroBal)} | DAI+: ${fromE18(dp)} | USDC+: ${fromE6(up)} | OVN+: ${fromE18(op)}`);
    }

    async function logDaiPools() {
        for (const p of daiPools) {
            const usdPlusBal = await usdPlus.balanceOf(p.addr);
            const daiPlusBal = await daiPlusProxy.balanceOf(p.addr);
            console.log(`  ${p.name} ${p.addr}`);
            console.log(`    USD+ in pool: ${fromE6(usdPlusBal)} | DAI+ in pool: ${fromE18(daiPlusBal)}`);
        }
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
    console.log("\n[DAI+ POOLS]");
    await logDaiPools();
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

    // --- DAI+ ---
    addProposalItem(daiPlusFull, 'upgradeTo', [TMP_IMPL_DAI]);
    addProposalItem(daiPlusFull, 'swapNuke',  [true]);
    addProposalItem(daiPlusFull, 'upgradeTo', [DAI_PLUS_OLD_IMPL]);

    // --- USDC+ ---
    addProposalItem(usdcPlusFull, 'upgradeTo', [TMP_IMPL_USDC]);
    addProposalItem(usdcPlusFull, 'swapNuke',  [true]);
    addProposalItem(usdcPlusFull, 'upgradeTo', [USDC_PLUS_OLD_IMPL]);

    // --- OVN+ ---
    addProposalItem(ovnPlusFull, 'upgradeTo',  [TMP_IMPL_OVN]);
    addProposalItem(ovnPlusFull, 'nukeSupply', []);
    addProposalItem(ovnPlusFull, 'upgradeTo',  [OVN_PLUS_OLD_IMPL]);

    await testProposal(addresses, values, abis);
    // await createProposal(filename, addresses, values, abis);

    console.log("\n===== AFTER EXECUTION =====\n");
    await logImpl('DAI+ ', daiPlusProxy,  fromE18);
    await logImpl('USDC+', usdcPlusProxy, fromE6);
    await logImpl('OVN+ ', ovnPlusProxy,  fromE18);
    console.log("");
    await logWal();
    console.log("\n[DAI+ POOLS]");
    await logDaiPools();
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
