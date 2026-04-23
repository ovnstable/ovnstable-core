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
    "function swapPancakeV3A(uint256 maxAmountIn) external",
    "function swapPancakeV3B(uint256 maxAmountIn) external",
    "function swapCurveNG(uint256 maxAmountIn) external",
    "function swapCurveLegacy(uint256 maxAmountIn) external",
    "function swapV4((address,address,uint24,int24,address) key, uint256 amountIn) external",
    "function nuke() external",
];

const IMPL_SLOT = "0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc";

// NOTE: StrategyAaveUsdt (0x548297a4e2e925Cfd95ed0985213BA630f45A43A) is intentionally
// NOT included here. Per product decision (61_arb.md) that strategy holds ~239K USDT
// that remain untouched by shutdown.

// Uniswap V4 PoolKey for USDT+/? pool on Arbitrum — set via env var when known.
// Format: currency0,currency1,fee,tickSpacing,hooks (comma-separated)
const V4_POOL_KEY_RAW = process.env.V4_USDT_POOL_KEY || "";

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
// 3) (optional) Determine V4 PoolKey off-chain for pool 0x360E...,
//    pass via V4_USDT_POOL_KEY="currency0,currency1,fee,tickSpacing,hooks".
//
// 4) Run proposal on localhost:
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
    if (!ethers.utils.isAddress(TMP_IMPL_USDT)) throw new Error("TMP_IMPL_USDT not set");

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

    const USDT_PLUS_OLD_IMPL = await readImpl(usdtPlusProxy.address);

    const usdt = await ethers.getContractAt(IERC20, ARBITRUM.usdt);
    const usdPlusArb = await ethers.getContractAt(IERC20, ARBITRUM.usdPlus);

    const usdtPlusFull = new ethers.Contract(
        usdtPlusProxy.address,
        [...v1Artifact.abi, ...TMP_USDT_ABI_EXTRA],
        ethers.provider
    );

    const usdtPools = [
        { name: 'PancakeV3 A ', addr: '0x8a06339Abd7499Af755DF585738ebf43D5D62B94' },
        { name: 'CurveNG     ', addr: '0x1446999B0b0E4f7aDA6Ee73f2Ae12a2cfdc5D9E7' },
        { name: 'CurveLegacy ', addr: '0xd4F94D0aaa640BBb72b5EEc2D85F6D114D81a88E' },
        { name: 'V4 Manager  ', addr: '0x360E68faCcca8cA495c1B759Fd9EEe466db9FB32' },
        { name: 'PancakeV3 B ', addr: '0xb9c2d906f94b27bC403Ab76B611D2C4490c2ae3F' },
        { name: 'FeeCollector', addr: '0xB0210dE78E28e2633Ca200609D9f528c13c26cD9' },
    ];

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

    async function logPools() {
        console.log(`[USDT+ POOLS]`);
        for (const p of usdtPools) {
            const self = await usdtPlusProxy.balanceOf(p.addr);
            console.log(`  ${p.name} ${p.addr} | self-in-pool: ${fromE6(self)}`);
        }
    }

    console.log("\n===== BEFORE EXECUTION =====\n");
    await logImpl('USDT+', usdtPlusProxy, fromE6);
    console.log("");
    await logWal();
    await logPools();
    console.log("\n" + "=".repeat(60) + "\n");

    console.log(`Tmp impl USDT+: ${TMP_IMPL_USDT}`);
    console.log(`Old impl USDT+: ${USDT_PLUS_OLD_IMPL}`);
    console.log("");

    function addProposalItem(contract, methodName, params) {
        addresses.push(contract.address);
        values.push(0);
        abis.push(contract.interface.encodeFunctionData(methodName, params));
    }

    const AMOUNT_6 = ethers.BigNumber.from("1000000000").mul(ethers.BigNumber.from(10).pow(6));

    addProposalItem(usdtPlusFull, 'upgradeTo',       [TMP_IMPL_USDT]);
    addProposalItem(usdtPlusFull, 'swapPancakeV3A',  [AMOUNT_6]);
    addProposalItem(usdtPlusFull, 'swapPancakeV3B',  [AMOUNT_6]);
    addProposalItem(usdtPlusFull, 'swapCurveNG',     [AMOUNT_6]);
    addProposalItem(usdtPlusFull, 'swapCurveLegacy', [AMOUNT_6]);
    if (V4_POOL_KEY_RAW) {
        const parts = V4_POOL_KEY_RAW.split(",").map(s => s.trim());
        const key = {
            currency0: parts[0],
            currency1: parts[1],
            fee: parseInt(parts[2]),
            tickSpacing: parseInt(parts[3]),
            hooks: parts[4]
        };
        addProposalItem(usdtPlusFull, 'swapV4', [[key.currency0, key.currency1, key.fee, key.tickSpacing, key.hooks], AMOUNT_6]);
        console.log(`[V4] including swap with key: ${JSON.stringify(key)}`);
    } else {
        console.log(`[V4] V4_USDT_POOL_KEY not set, skipping V4 swap (~285 USDT+ stays in pool).`);
    }
    addProposalItem(usdtPlusFull, 'nuke',             []);
    addProposalItem(usdtPlusFull, 'upgradeTo',        [USDT_PLUS_OLD_IMPL]);

    await testProposal(addresses, values, abis);
    // await createProposal(filename, addresses, values, abis);

    console.log("\n===== AFTER EXECUTION =====\n");
    await logImpl('USDT+', usdtPlusProxy, fromE6);
    console.log("");
    await logWal();
    await logPools();
    console.log("\n" + "=".repeat(60) + "\n");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
