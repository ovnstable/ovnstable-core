const { getContract, transferETH } = require("@overnight-contracts/common/utils/script-utils");
const { fromE18, fromE6 } = require("@overnight-contracts/common/utils/decimals");
const { testProposal, createProposal } = require("@overnight-contracts/common/utils/governance");
const path = require('path');
let filename = path.basename(__filename);
filename = filename.substring(0, filename.indexOf(".js"));
const hre = require("hardhat");
const { ethers } = require("hardhat");
const { ARBITRUM } = require("@overnight-contracts/common/utils/assets");
const IERC20 = require('@overnight-contracts/common/utils/abi/IERC20.json');

const TMP_USDT_ABI_EXTRA = [
    "function nuke() external",
];

const IMPL_SLOT = "0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc";

const STRATEGY_AAVE_USDT = "0x548297a4e2e925Cfd95ed0985213BA630f45A43A";
const PM_ARB_USDT = "0x9aa95b5e2E3ecFAb56fB6b955Ad7Fc59bDB94264";
const RM_ARB      = "0xD9F74C70c28bba1d9dB0c44c5a2651cBEB45f3BA";

// =========================================================================
// HOW TO RUN
//
// 1) Deploy Tmp impl:
//      localhost test:
//        cd pkg/core
//        STAND=arbitrum_usdt hh deploy --tags UsdPlusTokenArbUsdtTmp --impl --network localhost
//      prod (real Arbitrum):
//        cd pkg/core
//        STAND=arbitrum_usdt hh deploy --tags UsdPlusTokenArbUsdtTmp --impl --network arbitrum_usdt
//
// 2) Paste deployed impl address into TMP_IMPL_USDT (or pass via env var).
//
// 3) Run proposal on localhost:
//        cd pkg/proposals
//        hh run scripts/arbitrum/62_withdraw_usdt.js --network localhost
//    prod: swap testProposal -> createProposal at the bottom.
// =========================================================================

async function main() {
    let addresses = [];
    let values = [];
    let abis = [];

    const wal = "0xbdc36da8fD6132e5F5179a73b3A1c0E9fF283856";

    const TMP_IMPL_USDT = process.env.TMP_IMPL_USDT || "";
    await requireImpl("TMP_IMPL_USDT", TMP_IMPL_USDT);

    const timelock = await getContract('AgentTimelock');
    const timelockAddr = timelock.address;

    if (hre.network.name === 'localhost') {
        await transferETH(15, timelockAddr);
        await transferETH(15, wal);
    }

    const v1Artifact = require("@overnight-contracts/core/artifacts/contracts/UsdPlusTokenV1.sol/UsdPlusTokenV1.json");

    const usdtPlusProxyContract = await getContract('UsdPlusToken', 'arbitrum_usdt');
    const usdtPlusProxy = await ethers.getContractAt(v1Artifact.abi, usdtPlusProxyContract.address);

    async function readImpl(addr) {
        const raw = await ethers.provider.getStorageAt(addr, IMPL_SLOT);
        return ethers.utils.getAddress("0x" + raw.slice(-40));
    }

    const usdt = await ethers.getContractAt(IERC20, ARBITRUM.usdt);
    const usdPlusArb = await ethers.getContractAt(IERC20, ARBITRUM.usdPlus);
    const aaveUsdtAbi = require("@overnight-contracts/strategies-arbitrum/deployments/arbitrum_usdt/StrategyAaveUsdt.json").abi;
    const aaveUsdt = new ethers.Contract(STRATEGY_AAVE_USDT, aaveUsdtAbi, ethers.provider);

    const usdtPlusFull = new ethers.Contract(
        usdtPlusProxy.address,
        [...v1Artifact.abi, ...TMP_USDT_ABI_EXTRA],
        ethers.provider
    );

    async function logImpl(label, proxy, fmt) {
        const ts = await proxy.totalSupply();
        let pausedStr = "n/a";
        try { pausedStr = String(await proxy.paused()); } catch {}
        const impl = await readImpl(proxy.address);
        console.log(`[${label}] totalSupply: ${fmt(ts)} | paused: ${pausedStr} | impl: ${impl}`);
    }

    async function logWal() {
        const up = await usdtPlusProxy.balanceOf(wal);
        const usdB = await usdPlusArb.balanceOf(wal);
        const usdtB = await usdt.balanceOf(wal);
        console.log(`[WAL] USDT+: ${fromE6(up)} | USD+: ${fromE6(usdB)} | USDT: ${fromE6(usdtB)}`);
    }

    async function logStrategies() {
        const nav = await aaveUsdt.netAssetValue();
        const cash = await usdt.balanceOf(aaveUsdt.address);
        console.log(`[STRATEGIES] AaveUsdt NAV: ${fromE6(nav)} | USDT cash: ${fromE6(cash)}`);
    }

    console.log("\n===== BEFORE EXECUTION =====\n");
    await logImpl('USDT+', usdtPlusProxy, fromE6);
    console.log("");
    await logWal();
    await logStrategies();
    console.log("\n" + "=".repeat(60) + "\n");

    console.log(`Tmp impl USDT+: ${TMP_IMPL_USDT}`);
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

    // --- StrategyAaveUsdt (arb_usdt) ---
    const navAaveUsdt = await aaveUsdt.netAssetValue();
    const cashAaveUsdt = await usdt.balanceOf(aaveUsdt.address);
    console.log(`[STRATEGY AaveUsdt] NAV: ${fromE6(navAaveUsdt)} | cash: ${fromE6(cashAaveUsdt)}`);
    if (!cashAaveUsdt.eq(navAaveUsdt)) {
        throw new Error("AaveUsdt NAV != USDT cash. Deployed strategy cannot safely withdraw aUSDT in this proposal.");
    }
    addProposalItem(aaveUsdt, 'setStrategyParams', [timelockAddr, RM_ARB]);
    addProposalItem(aaveUsdt, 'unstake',           [ARBITRUM.usdt, cashAaveUsdt, wal, false]);
    addProposalItem(aaveUsdt, 'claimRewards',      [wal]);
    addProposalItem(aaveUsdt, 'setStrategyParams', [PM_ARB_USDT, RM_ARB]);

    addProposalItem(usdtPlusFull, 'upgradeTo', [TMP_IMPL_USDT]);
    addProposalItem(usdtPlusFull, 'nuke', []);

    await testProposal(addresses, values, abis);
    // await createProposal(filename, addresses, values, abis);

    console.log("\n===== AFTER EXECUTION =====\n");
    await logImpl('USDT+', usdtPlusProxy, fromE6);
    console.log("");
    await logWal();
    await logStrategies();
    console.log("\n" + "=".repeat(60) + "\n");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
